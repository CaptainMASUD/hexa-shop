import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Bundle from '../models/Bundle.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { commerceItemKey } from '../utils/commerce.js';

const activeWindowQuery = () => ({
  $and: [
    { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: new Date() } }] },
    { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: new Date() } }] },
  ],
});

const hydrateCart = async (cart) => {
  if (!cart) return { items: [] };
  await cart.populate([
    { path: 'items.product', select: 'name slug thumbnail regularPrice salePrice stock variants status productType currency customFields' },
    { path: 'items.bundle', select: 'name slug image regularPrice salePrice currency status startsAt endsAt items', populate: { path: 'items.product', select: 'name slug thumbnail status customFields' } },
  ]);
  cart.items = cart.items.filter((item) => {
    if (item.itemType === 'bundle') return item.bundle && item.bundle.status === 'active' && !item.bundle.deletedAt;
    return item.product && item.product.status === 'active';
  });
  return cart;
};

export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  return success(res, { data: await hydrateCart(cart) });
});

export const syncCart = asyncHandler(async (req, res) => {
  const normalized = req.body.items.map((raw) => ({
    itemType: raw.itemType || (raw.bundleId ? 'bundle' : 'product'),
    productId: raw.productId || null,
    bundleId: raw.bundleId || null,
    variantId: raw.variantId || null,
    quantity: Number(raw.quantity || 1),
    customerInputs: raw.customerInputs && typeof raw.customerInputs === 'object' ? raw.customerInputs : {},
  }));

  const productIds = [...new Set(normalized.filter((item) => item.itemType === 'product').map((item) => item.productId))];
  const bundleIds = [...new Set(normalized.filter((item) => item.itemType === 'bundle').map((item) => item.bundleId))];
  const [products, bundles] = await Promise.all([
    Product.find({ _id: { $in: productIds }, status: 'active' }).select('_id variants'),
    Bundle.find({ _id: { $in: bundleIds }, status: 'active', deletedAt: null, ...activeWindowQuery() }).select('_id'),
  ]);
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const bundleSet = new Set(bundles.map((bundle) => String(bundle._id)));
  const merged = new Map();

  for (const item of normalized) {
    if (item.itemType === 'bundle') {
      if (!bundleSet.has(String(item.bundleId))) continue;
    } else {
      const product = productMap.get(String(item.productId));
      if (!product) continue;
      if (item.variantId && !product.variants.id(item.variantId)?.active) continue;
    }
    const key = commerceItemKey(item);
    const current = merged.get(key);
    if (current) current.quantity = Math.min(20, current.quantity + item.quantity);
    else merged.set(key, { ...item });
  }

  const items = [...merged.values()].map((item) => item.itemType === 'bundle'
    ? { itemType: 'bundle', bundle: item.bundleId, product: null, variantId: null, quantity: item.quantity, customerInputs: item.customerInputs || {} }
    : { itemType: 'product', product: item.productId, bundle: null, variantId: item.variantId || null, quantity: item.quantity, customerInputs: item.customerInputs || {} });

  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items, lastActivityAt: new Date(), status: items.length ? 'active' : 'converted' } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  return success(res, { message: 'Cart synchronized', data: await hydrateCart(cart) });
});

export const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [], lastActivityAt: new Date(), status: 'converted' } }, { upsert: true });
  return success(res, { message: 'Cart cleared' });
});
