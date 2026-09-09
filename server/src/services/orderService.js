import mongoose from 'mongoose';
import Counter from '../models/Counter.js';
import Product from '../models/Product.js';
import PaymentMethod from '../models/PaymentMethod.js';
import StockMovement from '../models/StockMovement.js';
import ApiError from '../utils/ApiError.js';
import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import User from '../models/User.js';
import { getSettings } from './settingsService.js';
import Bundle from '../models/Bundle.js';
import Promotion from '../models/Promotion.js';
import {
  calculateCouponDiscount,
  calculatePromotionDiscount,
  commerceItemKey,
  effectivePrice,
  inventoryItemKey,
} from '../utils/commerce.js';
import { validateDynamicCustomerInputs } from '../utils/dynamicFieldValidator.js';

const activeWindowQuery = (now = new Date()) => ({
  $and: [
    { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
    { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
  ],
});

export const nextOrderNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `order-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return `HEXA-${year}-${String(counter.value).padStart(6, '0')}`;
};

const selectVariant = (product, variantId) => {
  if (!variantId) return null;
  const variant = product.variants.id(variantId);
  if (!variant || !variant.active) throw new ApiError(400, `Selected plan is unavailable for ${product.name}`);
  return variant;
};

const normalizeCartItems = (cartItems = []) => {
  const merged = new Map();
  for (const raw of cartItems) {
    const itemType = raw.itemType || (raw.bundleId ? 'bundle' : 'product');
    const item = {
      itemType,
      productId: itemType === 'product' && raw.productId ? String(raw.productId) : null,
      bundleId: itemType === 'bundle' && raw.bundleId ? String(raw.bundleId) : null,
      variantId: itemType === 'product' && raw.variantId ? String(raw.variantId) : null,
      quantity: Number(raw.quantity || 1),
      customerInputs: raw.customerInputs && typeof raw.customerInputs === 'object' ? raw.customerInputs : {},
    };
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new ApiError(400, 'Invalid cart quantity');
    if (item.itemType === 'product' && !mongoose.isValidObjectId(item.productId)) throw new ApiError(400, 'Invalid product in cart');
    if (item.itemType === 'bundle' && !mongoose.isValidObjectId(item.bundleId)) throw new ApiError(400, 'Invalid bundle in cart');
    if (item.variantId && !mongoose.isValidObjectId(item.variantId)) throw new ApiError(400, 'Invalid product plan in cart');
    const key = commerceItemKey(item);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      if (existing.quantity > 20) throw new ApiError(400, 'Combined cart quantity cannot exceed 20');
    } else merged.set(key, item);
  }
  return [...merged.values()];
};

const normalizeBundleComponents = (bundle) => (bundle.items || []).map((item) => ({
  productId: String(item.product),
  variantId: item.variantId ? String(item.variantId) : null,
  quantity: Number(item.quantity || 1),
}));

const consumeLegacyBundle = (items, bundle) => {
  const byKey = new Map(items.filter((item) => item.itemType === 'product').map((item) => [commerceItemKey(item), item]));
  for (const required of normalizeBundleComponents(bundle)) {
    const key = commerceItemKey({ itemType: 'product', productId: required.productId, variantId: required.variantId });
    const found = byKey.get(key);
    if (!found || found.quantity < required.quantity) throw new ApiError(400, 'Cart no longer matches the selected bundle');
  }
  for (const required of normalizeBundleComponents(bundle)) {
    const key = commerceItemKey({ itemType: 'product', productId: required.productId, variantId: required.variantId });
    byKey.get(key).quantity -= required.quantity;
  }
  return [
    ...items.filter((item) => item.itemType === 'bundle' || item.quantity > 0),
    { itemType: 'bundle', productId: null, bundleId: String(bundle._id), variantId: null, quantity: 1 },
  ];
};

const addInventoryRequirement = (map, snapshot) => {
  const key = inventoryItemKey(snapshot);
  const current = map.get(key);
  if (current) current.quantity += snapshot.quantity;
  else map.set(key, { ...snapshot });
};

export const buildCartSnapshot = async ({ cartItems = [], legacyBundleId = null, strict = true }) => {
  let normalized = normalizeCartItems(cartItems);
  const directBundleIds = normalized.filter((item) => item.itemType === 'bundle').map((item) => item.bundleId);
  if (legacyBundleId && !mongoose.isValidObjectId(legacyBundleId)) throw new ApiError(400, 'Invalid bundle');
  const allBundleIds = [...new Set([...directBundleIds, ...(legacyBundleId ? [String(legacyBundleId)] : [])])];
  const bundles = allBundleIds.length
    ? await Bundle.find({ _id: { $in: allBundleIds }, status: 'active', deletedAt: null, ...activeWindowQuery() })
    : [];
  const bundleMap = new Map(bundles.map((entry) => [String(entry._id), entry]));
  if (bundles.length !== allBundleIds.length) throw new ApiError(400, 'A bundle in your cart is unavailable or expired');

  if (legacyBundleId) normalized = consumeLegacyBundle(normalized, bundleMap.get(String(legacyBundleId)));
  normalized = normalizeCartItems(normalized);

  const productIdSet = new Set(normalized.filter((item) => item.itemType === 'product').map((item) => item.productId));
  for (const item of normalized.filter((entry) => entry.itemType === 'bundle')) {
    const bundle = bundleMap.get(String(item.bundleId));
    if (!bundle) throw new ApiError(400, 'A bundle in your cart is unavailable');
    for (const component of bundle.items || []) productIdSet.add(String(component.product));
  }

  const products = await Product.find({ _id: { $in: [...productIdSet] }, status: 'active' });
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const orderItems = [];
  const pricingLines = [];
  const inventoryMap = new Map();
  const bundleSummaries = [];

  for (const item of normalized) {
    if (item.itemType === 'product') {
      const product = productMap.get(item.productId);
      if (!product) throw new ApiError(400, 'A product in your cart is no longer available');
      const variant = selectVariant(product, item.variantId);
      const price = variant ? effectivePrice(variant.regularPrice, variant.salePrice) : effectivePrice(product.regularPrice, product.salePrice);
      const costPrice = variant?.costPrice ?? product.costPrice ?? 0;

      // Validate dynamic custom fields
      const { sanitizedInputs, fieldSnapshots } = validateDynamicCustomerInputs(
        product.customFields || [],
        item.customerInputs || {},
        { strict },
      );

      orderItems.push({
        itemType: 'product',
        productId: product._id,
        bundleId: null,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.thumbnail?.url || '',
        brand: product.brand || '',
        variantId: variant?._id || null,
        variantName: variant?.name || '',
        variantSku: variant?.sku || '',
        variantRegion: variant?.region || '',
        variantPlatform: variant?.platform || '',
        variantDuration: variant?.duration || '',
        price,
        costPrice,
        quantity: item.quantity,
        productType: product.productType,
        fulfillmentType: product.fulfillmentType || 'manual',
        customerInputs: sanitizedInputs,
        dynamicFieldSnapshots: fieldSnapshots,
        components: [],
        bundleSavings: 0,
      });

      pricingLines.push({ itemType: 'product', productId: product._id, categoryId: product.category, bundleId: null, lineTotal: price * item.quantity });
      addInventoryRequirement(inventoryMap, {
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.thumbnail?.url || '',
        variantId: variant?._id || null,
        variantName: variant?.name || '',
        quantity: item.quantity,
        productType: product.productType,
        unlimitedStock: Boolean(variant?.unlimitedStock || product.allowUnlimitedStock),
      });
      continue;
    }

    const bundle = bundleMap.get(String(item.bundleId));
    if (!bundle) throw new ApiError(400, 'A bundle in your cart is unavailable');
    const components = [];
    let componentRetailTotalPerBundle = 0;
    for (const rawComponent of bundle.items || []) {
      const product = productMap.get(String(rawComponent.product));
      if (!product) throw new ApiError(400, `A product inside ${bundle.name} is no longer available`);
      const variant = selectVariant(product, rawComponent.variantId ? String(rawComponent.variantId) : null);
      const unitPrice = variant ? effectivePrice(variant.regularPrice, variant.salePrice) : effectivePrice(product.regularPrice, product.salePrice);
      const quantityPerBundle = Number(rawComponent.quantity || 1);
      componentRetailTotalPerBundle += unitPrice * quantityPerBundle;
      components.push({
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.thumbnail?.url || '',
        brand: product.brand || '',
        variantId: variant?._id || null,
        variantName: variant?.name || '',
        variantSku: variant?.sku || '',
        variantRegion: variant?.region || '',
        variantPlatform: variant?.platform || '',
        variantDuration: variant?.duration || '',
        unitPrice,
        costPrice: variant?.costPrice ?? 0,
        quantityPerBundle,
        productType: product.productType,
        fulfillmentType: product.fulfillmentType || 'manual',
      });
      addInventoryRequirement(inventoryMap, {
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.thumbnail?.url || '',
        variantId: variant?._id || null,
        variantName: variant?.name || '',
        quantity: quantityPerBundle * item.quantity,
        productType: product.productType,
        unlimitedStock: Boolean(variant?.unlimitedStock || product.allowUnlimitedStock),
      });
    }
    const price = effectivePrice(bundle.regularPrice, bundle.salePrice);
    const savingsPerBundle = Math.max(0, componentRetailTotalPerBundle - price);
    orderItems.push({
      itemType: 'bundle',
      productId: null,
      bundleId: bundle._id,
      productName: bundle.name,
      productSlug: bundle.slug,
      productImage: bundle.image?.url || '',
      brand: '',
      variantId: null,
      variantName: '',
      variantSku: '',
      variantRegion: '',
      variantPlatform: '',
      variantDuration: '',
      price,
      costPrice: 0,
      quantity: item.quantity,
      productType: 'bundle',
      fulfillmentType: 'manual',
      customerInputs: item.customerInputs || {},
      dynamicFieldSnapshots: [],
      components,
      bundleSavings: Number((savingsPerBundle * item.quantity).toFixed(2)),
    });
    pricingLines.push({ itemType: 'bundle', productId: null, categoryId: null, bundleId: bundle._id, lineTotal: price * item.quantity });
    bundleSummaries.push({ bundleId: bundle._id, name: bundle.name, quantity: item.quantity, savings: Number((savingsPerBundle * item.quantity).toFixed(2)) });
  }

  const inventoryItems = [...inventoryMap.values()];
  for (const requirement of inventoryItems) {
    if (requirement.unlimitedStock) continue;
    const product = productMap.get(String(requirement.productId));
    const variant = requirement.variantId ? selectVariant(product, String(requirement.variantId)) : null;
    const availableStock = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
    if (availableStock < requirement.quantity) throw new ApiError(409, `${requirement.productName} does not have enough stock for this cart`);
  }

  const subtotal = Number(pricingLines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
  return { orderItems, inventoryItems, pricingLines, subtotal, bundleSummaries };
};

export const evaluateCoupon = async ({ code, userId, pricingLines, subtotal }) => {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return { coupon: null, discount: 0, eligibleSubtotal: 0 };
  const coupon = await Coupon.findOne({ code: normalizedCode, active: true, deletedAt: null, ...activeWindowQuery() }).lean();
  if (!coupon) throw new ApiError(400, 'Coupon is invalid or expired');
  if (subtotal < Number(coupon.minOrder || 0)) throw new ApiError(400, `Minimum order for this coupon is ৳${coupon.minOrder}`);
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached');
  const userUses = await CouponUsage.countDocuments({ coupon: coupon._id, user: userId });
  if (userUses >= coupon.perUserLimit) throw new ApiError(400, 'You have already used this coupon');
  const calculated = calculateCouponDiscount(coupon, pricingLines);
  if (calculated.eligibleSubtotal <= 0) throw new ApiError(400, 'Coupon does not apply to the selected cart items');
  return { coupon, ...calculated };
};

export const prepareOrder = async ({
  cartItems,
  paymentMethodId,
  customer,
  userId,
  couponCode = '',
  bundleId = null,
  walletAmount = 0,
  loyaltyPoints = 0,
  strict = true,
}) => {
  let method = null;
  if (paymentMethodId) {
    method = await PaymentMethod.findOne({ _id: paymentMethodId, active: true }).lean();
  }
  if (!method && strict) {
    throw new ApiError(400, 'Selected payment method is unavailable');
  }

  const snapshot = await buildCartSnapshot({ cartItems, legacyBundleId: bundleId, strict });
  const activePromotions = await Promotion.find({
    active: true,
    deletedAt: null,
    discountType: { $in: ['percent', 'fixed'] },
    ...activeWindowQuery(),
  }).lean();
  const promotionResult = calculatePromotionDiscount(activePromotions, snapshot.pricingLines);
  const promotionDiscount = promotionResult.discount;

  let couponInfo = { couponId: null, code: '', discount: 0 };
  let couponDiscount = 0;
  if (String(couponCode || '').trim()) {
    const result = await evaluateCoupon({ code: couponCode, userId, pricingLines: snapshot.pricingLines, subtotal: snapshot.subtotal });
    couponDiscount = Math.min(result.discount, Math.max(0, snapshot.subtotal - promotionDiscount));
    couponInfo = { couponId: result.coupon._id, code: result.coupon.code, discount: Number(couponDiscount.toFixed(2)) };
  }

  const user = await User.findById(userId).select('walletBalance loyaltyPoints').lean();
  if (!user) throw new ApiError(401, 'Account is unavailable');
  const settings = await getSettings();
  const requestedPoints = Math.min(Math.max(0, Math.floor(Number(loyaltyPoints || 0))), user.loyaltyPoints || 0);
  const pointValue = Number(settings.loyalty?.pointValueBDT || 0);
  let pointsDiscount = Math.min(Math.max(0, snapshot.subtotal - couponDiscount - promotionDiscount), requestedPoints * pointValue);
  const pointsUsed = pointValue > 0 ? Math.floor(pointsDiscount / pointValue) : 0;
  pointsDiscount = pointsUsed * pointValue;
  const remainingAfterPoints = Math.max(0, snapshot.subtotal - couponDiscount - promotionDiscount - pointsDiscount);
  const walletApplied = Math.min(remainingAfterPoints, Math.max(0, Number(walletAmount || 0)), Number(user.walletBalance || 0));
  const discount = Number((promotionDiscount + couponDiscount + pointsDiscount + walletApplied).toFixed(2));
  const total = Number(Math.max(0, snapshot.subtotal - discount).toFixed(2));
  const firstBundle = snapshot.bundleSummaries[0];

  return {
    method,
    customer,
    items: snapshot.orderItems,
    inventoryItems: snapshot.inventoryItems,
    subtotal: snapshot.subtotal,
    discount,
    total,
    currency: 'BDT',
    bundles: snapshot.bundleSummaries,
    bundle: firstBundle ? { bundleId: firstBundle.bundleId, name: firstBundle.name, discount: firstBundle.savings } : { bundleId: null, name: '', discount: 0 },
    promotion: promotionResult.promotion
      ? { discount: Number(promotionDiscount.toFixed(2)), campaigns: [{ promotionId: promotionResult.promotion._id, name: promotionResult.promotion.name }] }
      : { discount: 0, campaigns: [] },
    coupon: couponInfo,
    walletApplied: Number(walletApplied.toFixed(2)),
    loyaltyPointsRedeemed: pointsUsed,
  };
};

export const expandOrderItemsForInventory = (items = []) => {
  const map = new Map();
  for (const item of items) {
    if ((item.itemType || 'product') === 'bundle') {
      for (const component of item.components || []) {
        addInventoryRequirement(map, {
          productId: component.productId,
          productName: component.productName,
          productSlug: component.productSlug,
          productImage: component.productImage,
          variantId: component.variantId || null,
          variantName: component.variantName || '',
          quantity: Number(component.quantityPerBundle || 1) * Number(item.quantity || 1),
          productType: component.productType,
        });
      }
    } else {
      addInventoryRequirement(map, {
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        productImage: item.productImage,
        variantId: item.variantId || null,
        variantName: item.variantName || '',
        quantity: Number(item.quantity || 1),
        productType: item.productType,
      });
    }
  }
  return [...map.values()];
};

const normalizeInventoryItems = (items = []) => {
  const map = new Map();
  for (const item of items) addInventoryRequirement(map, { ...item, quantity: Number(item.quantity || 0) });
  return [...map.values()].filter((item) => item.quantity > 0);
};

export const reserveInventory = async (items, actorId = null) => {
  const normalized = normalizeInventoryItems(items);
  const completed = [];
  try {
    for (const item of normalized) {
      let before;
      let previousStock;
      if (item.variantId) {
        if (item.unlimitedStock) {
          before = await Product.findOneAndUpdate(
            { _id: item.productId, status: 'active', 'variants._id': item.variantId },
            { $inc: { 'variants.$.reservedQuantity': item.quantity, reservedQuantity: item.quantity } },
            { new: false },
          );
          previousStock = 9999;
        } else {
          before = await Product.findOneAndUpdate(
            { _id: item.productId, status: 'active', variants: { $elemMatch: { _id: item.variantId, active: true, stock: { $gte: item.quantity } } } },
            { $inc: { 'variants.$.stock': -item.quantity, 'variants.$.reservedQuantity': item.quantity, reservedQuantity: item.quantity } },
            { new: false },
          );
          const variant = before?.variants?.id(item.variantId);
          previousStock = variant?.stock;
        }
      } else if (item.unlimitedStock) {
        before = await Product.findOneAndUpdate(
          { _id: item.productId, status: 'active' },
          { $inc: { reservedQuantity: item.quantity } },
          { new: false },
        );
        previousStock = 9999;
      } else {
        before = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity }, status: 'active' },
          { $inc: { stock: -item.quantity, reservedQuantity: item.quantity } },
          { new: false },
        );
        previousStock = before?.stock;
      }
      if (!before || previousStock === undefined) throw new ApiError(409, `Stock changed while ordering ${item.productName}. Please review your cart.`);
      completed.push(item);
      await StockMovement.create({
        product: item.productId,
        variantId: item.variantId || null,
        previousStock,
        quantityChanged: item.unlimitedStock ? 0 : -item.quantity,
        newStock: item.unlimitedStock ? previousStock : previousStock - item.quantity,
        reason: 'Order reservation',
        changedBy: actorId,
      });
    }
  } catch (error) {
    await releaseInventory(completed, actorId, null, 'Reservation rollback', { strict: false });
    throw error;
  }
};

export const finalizeInventory = async (items) => {
  for (const item of normalizeInventoryItems(items)) {
    const filter = item.variantId
      ? { _id: item.productId, reservedQuantity: { $gte: item.quantity }, variants: { $elemMatch: { _id: item.variantId, reservedQuantity: { $gte: item.quantity } } } }
      : { _id: item.productId, reservedQuantity: { $gte: item.quantity } };
    const update = item.variantId
      ? { $inc: { 'variants.$.reservedQuantity': -item.quantity, 'variants.$.soldQuantity': item.quantity, reservedQuantity: -item.quantity, soldQuantity: item.quantity } }
      : { $inc: { reservedQuantity: -item.quantity, soldQuantity: item.quantity } };
    const result = await Product.updateOne(filter, update);
    if (result.modifiedCount !== 1) throw new ApiError(409, `Reserved stock for ${item.productName} is inconsistent`);
  }
};

export const releaseInventory = async (items, actorId = null, orderId = null, reason = 'Order released', { strict = true } = {}) => {
  for (const item of normalizeInventoryItems(items)) {
    let before;
    let previousStock;
    if (item.variantId) {
      if (item.unlimitedStock) {
        before = await Product.findOneAndUpdate(
          { _id: item.productId, reservedQuantity: { $gte: item.quantity }, variants: { $elemMatch: { _id: item.variantId, reservedQuantity: { $gte: item.quantity } } } },
          { $inc: { 'variants.$.reservedQuantity': -item.quantity, reservedQuantity: -item.quantity } },
          { new: false },
        );
        previousStock = 9999;
      } else {
        before = await Product.findOneAndUpdate(
          { _id: item.productId, reservedQuantity: { $gte: item.quantity }, variants: { $elemMatch: { _id: item.variantId, reservedQuantity: { $gte: item.quantity } } } },
          { $inc: { 'variants.$.stock': item.quantity, 'variants.$.reservedQuantity': -item.quantity, reservedQuantity: -item.quantity } },
          { new: false },
        );
        previousStock = before?.variants?.id(item.variantId)?.stock;
      }
    } else if (item.unlimitedStock) {
      before = await Product.findOneAndUpdate(
        { _id: item.productId, reservedQuantity: { $gte: item.quantity } },
        { $inc: { reservedQuantity: -item.quantity } },
        { new: false },
      );
      previousStock = 9999;
    } else {
      before = await Product.findOneAndUpdate(
        { _id: item.productId, reservedQuantity: { $gte: item.quantity } },
        { $inc: { stock: item.quantity, reservedQuantity: -item.quantity } },
        { new: false },
      );
      previousStock = before?.stock;
    }
    if (!before || previousStock === undefined) {
      if (strict) throw new ApiError(409, `Reserved stock for ${item.productName} is already released or inconsistent`);
      continue;
    }
    await StockMovement.create({
      product: item.productId,
      variantId: item.variantId || null,
      previousStock,
      quantityChanged: item.unlimitedStock ? 0 : item.quantity,
      newStock: item.unlimitedStock ? previousStock : previousStock + item.quantity,
      reason,
      order: orderId,
      changedBy: actorId,
    });
  }
};

