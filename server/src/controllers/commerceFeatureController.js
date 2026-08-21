import Bundle from '../models/Bundle.js';
import Promotion from '../models/Promotion.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { getSettings } from '../services/settingsService.js';
import { buildCartSnapshot, evaluateCoupon, prepareOrder } from '../services/orderService.js';

const activeWindow = () => ({
  $and: [
    { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: new Date() } }] },
    { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: new Date() } }] },
  ],
});

export const bundles = asyncHandler(async (req, res) => {
  const filter = { status: 'active', deletedAt: null, ...activeWindow() };
  if (req.query.featured === 'true') filter.featured = true;
  const rows = await Bundle.find(filter)
    .populate({ path: 'items.product', select: 'name slug thumbnail regularPrice salePrice variants status productType' })
    .sort({ featured: -1, createdAt: -1 })
    .limit(30)
    .lean();
  const data = rows.filter((entry) => (entry.items || []).length > 1 && entry.items.every((item) => item.product && item.product.status === 'active'));
  return success(res, { data });
});

export const bundle = asyncHandler(async (req, res) => {
  const data = await Bundle.findOne({ slug: req.params.slug, status: 'active', deletedAt: null, ...activeWindow() })
    .populate({ path: 'items.product', populate: { path: 'category', select: 'name slug' } })
    .lean();
  if (!data || !(data.items || []).every((item) => item.product && item.product.status === 'active')) throw new ApiError(404, 'Bundle not found');
  return success(res, { data });
});

export const promotions = asyncHandler(async (_req, res) => {
  const data = await Promotion.find({ active: true, deletedAt: null, ...activeWindow() })
    .populate('products', 'name slug thumbnail regularPrice salePrice')
    .populate('categories', 'name slug image')
    .populate('bundles', 'name slug image regularPrice salePrice')
    .populate('bundle', 'name slug image regularPrice salePrice')
    .sort({ displayOrder: 1, createdAt: -1 })
    .lean();
  return success(res, { data });
});

export const publicSettings = asyncHandler(async (_req, res) => {
  const doc = await getSettings();
  const data = doc ? (typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }) : {
    currencies: [{ code: 'BDT', symbol: '৳', rateFromBDT: 1, active: true }, { code: 'USD', symbol: '$', rateFromBDT: 0.0082, active: true }],
    faq: [],
  };
  if (data.webhooks) delete data.webhooks;
  return success(res, { data });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  let subtotal;
  let pricingLines;
  if (req.body.items?.length) {
    const snapshot = await buildCartSnapshot({ cartItems: req.body.items, legacyBundleId: req.body.bundleId });
    subtotal = snapshot.subtotal;
    pricingLines = snapshot.pricingLines;
  } else {
    subtotal = Math.max(0, Number(req.body.subtotal || 0));
    const code = String(req.body.code || '').trim().toUpperCase();
    const coupon = await Coupon.findOne({ code, active: true, deletedAt: null, ...activeWindow() }).lean();
    if (!coupon) throw new ApiError(400, 'Coupon is invalid or expired');
    const restricted = (coupon.allowedProducts?.length || 0) + (coupon.allowedCategories?.length || 0) + (coupon.allowedBundles?.length || 0) > 0;
    if (restricted) throw new ApiError(422, 'Cart items are required to validate a product/category/bundle-specific coupon');
    pricingLines = [{ itemType: 'product', productId: null, categoryId: null, bundleId: null, lineTotal: subtotal }];
  }
  const result = await evaluateCoupon({ code: req.body.code, userId: req.user._id, pricingLines, subtotal });
  return success(res, {
    data: {
      code: result.coupon.code,
      discount: result.discount,
      eligibleSubtotal: result.eligibleSubtotal,
      subtotal,
      description: result.coupon.description,
    },
  });
});

export const invoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id }).lean();
  if (!order) throw new ApiError(404, 'Order not found');
  const settings = await getSettings();
  return success(res, { data: { invoiceNumber: `INV-${order.orderNumber}`, issuedAt: order.createdAt, store: { name: settings.storeName, tagline: settings.tagline }, order } });
});

export const checkoutQuote = asyncHandler(async (req, res) => {
  const prepared = await prepareOrder({
    cartItems: req.body.items || [],
    paymentMethodId: req.body.paymentMethodId,
    customer: req.body.customer || { name: req.user.name, email: req.user.email, phone: req.user.phone || '00000' },
    userId: req.user._id,
    couponCode: req.body.couponCode,
    bundleId: req.body.bundleId,
    walletAmount: req.body.walletAmount,
    loyaltyPoints: req.body.loyaltyPoints,
  });
  return success(res, {
    data: {
      items: prepared.items,
      subtotal: prepared.subtotal,
      discount: prepared.discount,
      total: prepared.total,
      coupon: prepared.coupon,
      bundle: prepared.bundle,
      bundles: prepared.bundles,
      promotion: prepared.promotion,
      walletApplied: prepared.walletApplied,
      loyaltyPointsRedeemed: prepared.loyaltyPointsRedeemed,
      currency: prepared.currency,
    },
  });
});
