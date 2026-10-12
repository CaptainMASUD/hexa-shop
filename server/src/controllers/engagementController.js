import crypto from 'crypto';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import SupportTicket from '../models/SupportTicket.js';
import Notification from '../models/Notification.js';
import Subscription from '../models/Subscription.js';
import RefundRequest from '../models/RefundRequest.js';
import WalletTransaction from '../models/WalletTransaction.js';
import ActivityLog from '../models/ActivityLog.js';
import Session from '../models/Session.js';
import PaymentMethod from '../models/PaymentMethod.js';
import ProductInteraction from '../models/ProductInteraction.js';
import Category from '../models/Category.js';
import { getRecommendationsForUser } from '../services/recommendationService.js';
import { ensureAdminOperationalAlerts } from '../services/operationalAlertService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { nextSequence } from '../services/sequenceService.js';
import { ensureExpiryNotifications, createSubscriptionsForOrder } from '../services/subscriptionService.js';
import { decryptJson } from '../utils/encryption.js';
import { processTicketWithAi } from '../services/aiSupportService.js';

const logActivity = (req, type, extra = {}) => ActivityLog.create({ user: req.user?._id || null, type, ipAddress: req.ip, ...extra }).catch(() => {});

export const wishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'wishlist', match: { status: 'active' }, populate: { path: 'category', select: 'name slug' } });
  return success(res, { data: user.wishlist });
});
export const addWishlist = asyncHandler(async (req, res) => {
  const exists = await Product.exists({ _id: req.params.productId, status: 'active' }); if (!exists) throw new ApiError(404, 'Product not found');
  await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: req.params.productId } });
  await ProductInteraction.recordEvent(req.user._id, req.params.productId, 'wishlist_add');
  await logActivity(req, 'wishlist_added', { product: req.params.productId });
  return success(res, { message: 'Added to wishlist' });
});
export const removeWishlist = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.productId } });
  await ProductInteraction.recordEvent(req.user._id, req.params.productId, 'wishlist_remove');
  return success(res, { message: 'Removed from wishlist' });
});

const refreshRating = async (productId) => {
  const [stats] = await Review.aggregate([{ $match: { product: Product.db.base.Types.ObjectId.createFromHexString(String(productId)), status: 'published' } }, { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  await Product.updateOne({ _id: productId }, { ratingAverage: stats?.average || 0, reviewCount: stats?.count || 0 });
};
export const productReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(30, Math.max(1, Number(req.query.limit || 10)));
  const filter = { product: req.params.productId, status: 'published' };
  const [data, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return success(res, { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const canReviewProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId, status: 'active' }).select('_id').lean();
  if (!product) throw new ApiError(404, 'Product not found');

  const hasPurchased = Boolean(
    await Order.exists({
      user: req.user._id,
      status: { $in: ['confirmed', 'processing', 'delivered'] },
      $or: [
        { 'items.productId': product._id },
        { 'items.components.productId': product._id },
      ],
    })
  );

  const existingReview = await Review.findOne({
    product: product._id,
    user: req.user._id,
  }).lean();

  return success(res, {
    data: {
      canReview: hasPurchased,
      hasReviewed: Boolean(existingReview),
      review: existingReview,
    },
  });
});

export const saveReview = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.body.productId, status: 'active' });
  if (!product) throw new ApiError(404, 'Product not found');

  const hasPurchased = Boolean(
    await Order.exists({
      user: req.user._id,
      status: { $in: ['confirmed', 'processing', 'delivered'] },
      $or: [
        { 'items.productId': product._id },
        { 'items.components.productId': product._id },
      ],
    })
  );

  if (!hasPurchased) {
    throw new ApiError(403, 'Only verified customers who purchased this product can leave a review.');
  }

  const review = await Review.findOneAndUpdate(
    { product: product._id, user: req.user._id },
    {
      rating: Math.max(1, Math.min(5, Number(req.body.rating) || 5)),
      title: req.body.title || '',
      comment: req.body.comment,
      verifiedPurchase: true,
      status: 'published',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await refreshRating(product._id);
  await logActivity(req, 'review_saved', { product: product._id });
  return success(res, { message: 'Review saved successfully', data: review });
});
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) throw new ApiError(404, 'Review not found');
  await refreshRating(review.product);
  return success(res, { message: 'Review removed' });
});

export const addRecentlyViewed = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId, status: 'active' }).select('_id');
  if (!product) throw new ApiError(404, 'Product not found');

  // 1. Record consolidated interaction (increments view count, updates lastViewedAt)
  await ProductInteraction.recordEvent(req.user._id, product._id, 'view');

  // 2. Remove existing entry for this product atomically in User document
  await User.updateOne(
    { _id: req.user._id },
    { $pull: { recentlyViewed: { product: product._id } } }
  );

  // 3. Prepend the new entry and trim to 20 items atomically
  await User.updateOne(
    { _id: req.user._id },
    {
      $push: {
        recentlyViewed: {
          $each: [{ product: product._id, viewedAt: new Date() }],
          $position: 0,
          $slice: 20,
        },
      },
    }
  );

  await logActivity(req, 'product_viewed', { product: product._id });
  return success(res, { message: 'View recorded' });
});
export const recentlyViewed = asyncHandler(async (req,res)=>{ const user=await User.findById(req.user._id).populate({path:'recentlyViewed.product',match:{status:'active'},populate:{path:'category',select:'name slug'}}); return success(res,{data:user.recentlyViewed.filter(x=>x.product)}); });

export const recommendations = asyncHandler(async (req, res) => {
  const cartProductIds = req.query.cartProductIds
    ? String(req.query.cartProductIds).split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const guestViewProductIds = req.query.guestViewProductIds
    ? String(req.query.guestViewProductIds).split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const data = await getRecommendationsForUser(req.user?._id || null, {
    limit: req.query.limit || 5,
    category: req.query.category,
    currentProductId: req.query.currentProductId,
    search: req.query.search || req.query.q,
    cartProductIds,
    guestViewProductIds,
  });

  return success(res, { data });
});

export const createTicket = asyncHandler(async (req, res) => {
  const n = await nextSequence('ticket');
  const ticketNumber = `HX-${String(n).padStart(6, '0')}`;
  const ticket = await SupportTicket.create({
    ticketNumber,
    user: req.user._id,
    subject: req.body.subject,
    category: req.body.category || 'other',
    priority: req.body.priority || 'normal',
    order: req.body.orderId || null,
    messages: [{ sender: req.user._id, message: req.body.message, isAdmin: false }],
  });
  processTicketWithAi(ticket._id).catch((err) => console.error('[createTicket AI agent error]', err.message));
  return success(res, { status: 201, message: 'Support ticket created', data: ticket });
});
export const myTickets = asyncHandler(async (req,res)=>success(res,{data:await SupportTicket.find({user:req.user._id}).sort({lastReplyAt:-1}).lean()}));
export const myTicket = asyncHandler(async (req,res)=>{ const t=await SupportTicket.findOne({_id:req.params.id,user:req.user._id}).populate('messages.sender','name role').lean(); if(!t) throw new ApiError(404,'Ticket not found'); return success(res,{data:t}); });
export const replyTicket = asyncHandler(async (req, res) => {
  const t = await SupportTicket.findOne({ _id: req.params.id, user: req.user._id });
  if (!t) throw new ApiError(404, 'Ticket not found');
  if (['closed', 'resolved'].includes(t.status)) throw new ApiError(409, 'Ticket is closed');
  t.messages.push({ sender: req.user._id, message: req.body.message, isAdmin: false });
  t.lastReplyAt = new Date();
  t.status = 'open';
  await t.save();
  processTicketWithAi(t._id).catch((err) => console.error('[replyTicket AI agent error]', err.message));
  return success(res, { message: 'Reply sent', data: t });
});

export const notifications = asyncHandler(async (req,res)=>{
  await ensureExpiryNotifications(req.user._id); if(req.user.role==='admin') await ensureAdminOperationalAlerts(); const q={ $and:[{ $or:[{user:req.user._id},{audience:'all'},{audience:req.user.role==='admin'?'admin':'user',user:null}]},{ $or:[{expiresAt:null},{expiresAt:{$exists:false}},{expiresAt:{$gt:new Date()}}]} ]};
  const data=await Notification.find(q).sort({createdAt:-1}).limit(50).lean(); const mapped=data.map(n=>({...n,read:(n.readBy||[]).some(id=>String(id)===String(req.user._id))})); return success(res,{data:mapped});
});
export const readNotification = asyncHandler(async (req,res)=>{ await Notification.updateOne({_id:req.params.id},{$addToSet:{readBy:req.user._id}}); return success(res,{message:'Notification read'}); });
export const readAllNotifications = asyncHandler(async (req,res)=>{ await Notification.updateMany({$or:[{user:req.user._id},{audience:'all'},{audience:req.user.role==='admin'?'admin':'user',user:null}]},{$addToSet:{readBy:req.user._id}}); return success(res,{message:'Notifications read'}); });

export const subscriptions = asyncHandler(async (req, res) => {
  const userOrders = await Order.find({
    user: req.user._id,
    status: { $nin: ['cancelled', 'rejected', 'refunded'] },
  }).select('+deliveries +deliveries.encryptedPayload').lean();

  for (const ord of userOrders) {
    await createSubscriptionsForOrder(ord).catch(() => {});
  }

  await Subscription.updateMany({ user: req.user._id, status: 'active', expiresAt: { $lt: new Date() } }, { $set: { status: 'expired' } });
  await ensureExpiryNotifications(req.user._id);

  const data = await Subscription.find({ user: req.user._id })
    .populate('product', 'name slug thumbnail status productType')
    .sort({ createdAt: -1 })
    .lean();

  const orderMap = new Map(userOrders.map((o) => [String(o._id), o]));
  const mapped = data.map((sub) => {
    const order = orderMap.get(String(sub.order));
    let delivery = null;
    if (order?.deliveries?.length) {
      const match = order.deliveries.find((d) => String(d.orderItemId) === String(sub.orderItemId))
        || (order.deliveries.length === 1 ? order.deliveries[0] : null);
      if (match && match.encryptedPayload) {
        try {
          delivery = {
            _id: match._id,
            summary: match.summary,
            deliveredAt: match.deliveredAt,
            details: decryptJson(match.encryptedPayload),
          };
        } catch (e) {
          console.error('[Subscriptions] Failed to decrypt delivery details:', e.message);
        }
      }
    }
    return {
      ...sub,
      orderNumber: order?.orderNumber || '',
      orderStatus: order?.status || '',
      delivery,
    };
  });

  return success(res, { data: mapped });
});
export const toggleAutoRenew = asyncHandler(async (req,res)=>{ const s=await Subscription.findOneAndUpdate({_id:req.params.id,user:req.user._id},{$set:{autoRenew:Boolean(req.body.autoRenew)}},{new:true}); if(!s) throw new ApiError(404,'Subscription not found'); return success(res,{message:'Renewal preference updated',data:s}); });

export const wallet = asyncHandler(async (req,res)=>{ const user=await User.findById(req.user._id).select('walletBalance loyaltyPoints referralCode referralStats').lean(); const tx=await WalletTransaction.find({user:req.user._id}).sort({createdAt:-1}).limit(50).lean(); return success(res,{data:{...user,transactions:tx}}); });
export const referral = asyncHandler(async (req,res)=>{ const user=await User.findById(req.user._id).select('referralCode referralStats walletBalance').lean(); const referred=await User.find({referredBy:req.user._id}).select('name createdAt').sort({createdAt:-1}).limit(50).lean(); return success(res,{data:{...user,referredUsers:referred}}); });

export const createRefund = asyncHandler(async (req,res)=>{ const order=await Order.findOne({_id:req.body.orderId,user:req.user._id}); if(!order) throw new ApiError(404,'Order not found'); if(!['confirmed','processing','delivered'].includes(order.status)) throw new ApiError(409,'This order is not eligible for a refund request'); if(await RefundRequest.exists({order:order._id,status:{$in:['requested','reviewing','approved']}})) throw new ApiError(409,'A refund request already exists'); const refund=await RefundRequest.create({user:req.user._id,order:order._id,reason:req.body.reason,requestedAmount:Math.min(Number(req.body.amount||order.total),order.total)}); return success(res,{status:201,message:'Refund request submitted',data:refund}); });
export const myRefunds = asyncHandler(async (req,res)=>success(res,{data:await RefundRequest.find({user:req.user._id}).populate('order','orderNumber total status').sort({createdAt:-1}).lean()}));

export const mySessions = asyncHandler(async (req,res)=>{ const data=await Session.find({user:req.user._id,revokedAt:null,expiresAt:{$gt:new Date()}}).select('createdAt expiresAt ipAddress userAgent').sort({createdAt:-1}).lean(); return success(res,{data}); });
export const revokeSession = asyncHandler(async (req,res)=>{ await Session.updateOne({_id:req.params.id,user:req.user._id},{$set:{revokedAt:new Date()}}); return success(res,{message:'Session revoked'}); });
export const activity = asyncHandler(async (req,res)=>success(res,{data:await ActivityLog.find({user:req.user._id}).sort({createdAt:-1}).limit(100).lean()}));

/**
 * SAFE Chatbot Context Endpoint
 * Returns non-sensitive customer account summaries for the AI assistant without exposing any secrets,
 * passwords, PINs, license keys, delivery credentials, or tokens.
 */
export const chatbotContext = asyncHandler(async (req, res) => {
  const user = req.user.toPublicJSON ? req.user.toPublicJSON() : req.user;
  const [orders, subscriptions, paymentMethods, categories, recommendedProducts, userWithPrefs] = await Promise.all([
    Order.find({ user: req.user._id })
      .select('orderNumber total status payment.status createdAt items.productName items.quantity')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Subscription.find({ user: req.user._id })
      .select('productName plan duration status expiresAt autoRenew createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    PaymentMethod.find({ active: true })
      .select('name accountType gatewayType')
      .sort({ displayOrder: 1, name: 1 })
      .lean(),
    Category.find({ status: 'active' })
      .select('name slug')
      .sort({ displayOrder: 1, name: 1 })
      .lean(),
    getRecommendationsForUser(req.user._id, { limit: 4 }),
    User.findById(req.user._id)
      .populate({ path: 'wishlist', match: { status: 'active' }, select: 'name slug' })
      .populate({ path: 'recentlyViewed.product', match: { status: 'active' }, select: 'name slug' })
      .lean(),
  ]);

  const wishlistSummaries = (userWithPrefs?.wishlist || []).slice(0, 8).map((p) => ({
    name: p.name,
    slug: p.slug,
    url: `/product/${p.slug}`,
  }));

  const recentViewSummaries = (userWithPrefs?.recentlyViewed || [])
    .filter((v) => v?.product)
    .slice(0, 8)
    .map((v) => ({
      name: v.product.name,
      slug: v.product.slug,
      url: `/product/${v.product.slug}`,
    }));

  return success(res, {
    data: {
      account: {
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance || 0,
        loyaltyPoints: user.loyaltyPoints || 0,
        referralCode: user.referralCode || '',
        isEmailVerified: Boolean(user.isEmailVerified),
      },
      availableCategories: (categories || []).map((c) => ({
        name: c.name,
        slug: c.slug,
        url: `/products?category=${c.slug}`,
      })),
      availablePaymentMethods: paymentMethods.map((p) => ({
        name: p.name,
        type: p.accountType || p.gatewayType,
      })),
      shoppingPreferences: {
        wishlist: wishlistSummaries,
        recentlyViewed: recentViewSummaries,
      },
      recommendedProducts,
      recentOrders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        total: o.total,
        orderStatus: o.status,
        paymentStatus: o.payment?.status || 'pending',
        items: o.items?.map((i) => `${i.productName} (x${i.quantity})`).join(', ') || 'Digital Products',
        createdAt: o.createdAt,
      })),
      subscriptions: subscriptions.map((s) => ({
        productName: s.productName,
        plan: s.plan || 'Standard',
        status: s.status,
        expiresAt: s.expiresAt,
        autoRenew: Boolean(s.autoRenew),
      })),
    },
  });
});

