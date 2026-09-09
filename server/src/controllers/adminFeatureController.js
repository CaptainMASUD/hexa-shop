import Coupon from '../models/Coupon.js';
import Bundle from '../models/Bundle.js';
import Promotion from '../models/Promotion.js';
import Review from '../models/Review.js';
import SupportTicket from '../models/SupportTicket.js';
import RefundRequest from '../models/RefundRequest.js';
import Notification from '../models/Notification.js';
import Role from '../models/Role.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import PaymentMethod from '../models/PaymentMethod.js';
import SiteSettings from '../models/SiteSettings.js';
import WalletTransaction from '../models/WalletTransaction.js';
import ActivityLog from '../models/ActivityLog.js';
import Subscription from '../models/Subscription.js';
import Banner from '../models/Banner.js';
import AffiliatePayout from '../models/AffiliatePayout.js';
import FraudBlock from '../models/FraudBlock.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { toSlug } from '../utils/slug.js';
import { writeAudit } from '../services/auditService.js';
import { getSettings } from '../services/settingsService.js';
import { creditWallet } from '../services/rewardService.js';
import { notifyUser } from '../services/notificationService.js';
import { ensureAdminOperationalAlerts } from '../services/operationalAlertService.js';
import { paginateWithCursor } from '../utils/cursorPagination.js';

const existingIds = async (Model, ids = [], filter = {}) => {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!unique.length) return true;
  const count = await Model.countDocuments({ _id: { $in: unique }, ...filter });
  return count === unique.length;
};

const ensureBundleReferences = async (payload) => {
  if (!payload.items) return;
  const productIds = payload.items.map((item) => item.product || item.productId);
  const products = await Product.find({ _id: { $in: productIds }, status: { $ne: 'archived' } }).select('_id variants');
  if (products.length !== new Set(productIds.map(String)).size) throw new ApiError(422, 'One or more bundle products are unavailable');
  const map = new Map(products.map((product) => [String(product._id), product]));
  for (const item of payload.items) {
    const productId = String(item.product || item.productId);
    if (item.variantId && !map.get(productId)?.variants?.id(item.variantId)?.active) throw new ApiError(422, 'A selected bundle product plan is unavailable');
  }
};

const normalizeBundlePayload = (body, current = null) => {
  const payload = { ...body };
  if (payload.items) payload.items = payload.items.map((item) => ({ product: item.product || item.productId, variantId: item.variantId || null, quantity: Number(item.quantity || 1) }));
  if (payload.slug !== undefined || payload.name !== undefined) payload.slug = toSlug(payload.slug || payload.name || current?.name || '');
  if (payload.code !== undefined) payload.code = String(payload.code || '').trim().toUpperCase();
  return payload;
};

const normalizePromotionPayload = (body) => {
  const payload = { ...body };
  if (payload.bundle) payload.bundles = [...new Set([...(payload.bundles || []), payload.bundle].filter(Boolean).map(String))];
  if (payload.bundles) payload.bundles = [...new Set(payload.bundles.filter(Boolean).map(String))];
  if (payload.products) payload.products = [...new Set(payload.products.filter(Boolean).map(String))];
  if (payload.categories) payload.categories = [...new Set(payload.categories.filter(Boolean).map(String))];
  if (payload.bundle !== undefined) payload.bundle = null;
  if (payload.discountType === 'display_only') payload.discountValue = 0;
  return payload;
};

const ensureCouponReferences = async (payload) => {
  const [productsOk, categoriesOk, bundlesOk] = await Promise.all([
    existingIds(Product, payload.allowedProducts, { status: { $ne: 'archived' } }),
    existingIds(Category, payload.allowedCategories, { status: { $ne: 'archived' } }),
    existingIds(Bundle, payload.allowedBundles, { deletedAt: null, status: { $ne: 'archived' } }),
  ]);
  if (!productsOk || !categoriesOk || !bundlesOk) throw new ApiError(422, 'Coupon contains an unavailable target');
};

const ensurePromotionReferences = async (payload) => {
  const normalized = normalizePromotionPayload(payload);
  const [productsOk, categoriesOk, bundlesOk] = await Promise.all([
    existingIds(Product, normalized.products, { status: { $ne: 'archived' } }),
    existingIds(Category, normalized.categories, { status: { $ne: 'archived' } }),
    existingIds(Bundle, normalized.bundles, { deletedAt: null, status: { $ne: 'archived' } }),
  ]);
  if (!productsOk || !categoriesOk || !bundlesOk) throw new ApiError(422, 'Promotion contains an unavailable target');
  return normalized;
};

export const bundleCrud = {
  list: asyncHandler(async (req, res) => {
    const filter = req.query.includeDeleted === 'true' ? {} : { deletedAt: null };
    const data = await Bundle.find(filter).populate('items.product', 'name slug thumbnail variants status').sort({ createdAt: -1 }).lean();
    return success(res, { data });
  }),
  get: asyncHandler(async (req, res) => {
    const doc = await Bundle.findOne({ _id: req.params.id, deletedAt: null }).populate('items.product', 'name slug thumbnail variants status').lean();
    if (!doc) throw new ApiError(404, 'Bundle not found');
    return success(res, { data: doc });
  }),
  create: asyncHandler(async (req, res) => {
    const payload = normalizeBundlePayload(req.body);
    await ensureBundleReferences(payload);
    const doc = await Bundle.create(payload);
    await writeAudit(req, 'Bundle_created', 'Bundle', doc._id);
    return success(res, { status: 201, message: 'Bundle created', data: doc });
  }),
  update: asyncHandler(async (req, res) => {
    const doc = await Bundle.findOne({ _id: req.params.id, deletedAt: null });
    if (!doc) throw new ApiError(404, 'Bundle not found');
    const payload = normalizeBundlePayload(req.body, doc);
    await ensureBundleReferences(payload);
    Object.assign(doc, payload);
    await doc.save();
    await writeAudit(req, 'Bundle_updated', 'Bundle', doc._id);
    return success(res, { message: 'Bundle updated', data: doc });
  }),
  remove: asyncHandler(async (req, res) => {
    const doc = await Bundle.findOne({ _id: req.params.id, deletedAt: null });
    if (!doc) throw new ApiError(404, 'Bundle not found');
    doc.deletedOriginalSlug = doc.slug; doc.slug = `${doc.slug}-deleted-${String(doc._id).slice(-6)}`; doc.status = 'archived'; doc.deletedAt = new Date(); await doc.save();
    await Promise.all([
      Cart.updateMany({}, { $pull: { items: { itemType: 'bundle', bundle: doc._id } } }),
      Promotion.updateMany({}, { $pull: { bundles: doc._id } }),
      Promotion.updateMany({ bundle: doc._id }, { $set: { bundle: null } }),
      Coupon.updateMany({}, { $pull: { allowedBundles: doc._id } }),
      Banner.updateMany({ targetType: 'bundle', targetId: doc._id }, { $set: { active: false, targetType: 'none', targetId: null } }),
    ]);
    await writeAudit(req, 'Bundle_deleted', 'Bundle', doc._id);
    return success(res, { message: 'Bundle deleted' });
  }),
};

export const couponCrud = {
  list: asyncHandler(async (req, res) => {
    const filter = req.query.includeDeleted === 'true' ? {} : { deletedAt: null };
    const data = await Coupon.find(filter).populate('allowedProducts', 'name slug').populate('allowedCategories', 'name slug').populate('allowedBundles', 'name slug').sort({ createdAt: -1 }).lean();
    return success(res, { data });
  }),
  get: asyncHandler(async (req, res) => {
    const doc = await Coupon.findOne({ _id: req.params.id, deletedAt: null }).populate('allowedProducts', 'name slug').populate('allowedCategories', 'name slug').populate('allowedBundles', 'name slug').lean();
    if (!doc) throw new ApiError(404, 'Coupon not found');
    return success(res, { data: doc });
  }),
  create: asyncHandler(async (req, res) => {
    const payload = { ...req.body, code: String(req.body.code || '').trim().toUpperCase() };
    await ensureCouponReferences(payload);
    const doc = await Coupon.create(payload);
    await writeAudit(req, 'Coupon_created', 'Coupon', doc._id);
    return success(res, { status: 201, message: 'Coupon created', data: doc });
  }),
  update: asyncHandler(async (req, res) => {
    const doc = await Coupon.findOne({ _id: req.params.id, deletedAt: null });
    if (!doc) throw new ApiError(404, 'Coupon not found');
    const payload = { ...req.body };
    if (payload.code !== undefined) payload.code = String(payload.code).trim().toUpperCase();
    if (payload.usageLimit !== undefined && Number(payload.usageLimit) > 0 && Number(payload.usageLimit) < Number(doc.usedCount || 0)) throw new ApiError(422, 'Usage limit cannot be lower than current usage');
    await ensureCouponReferences(payload);
    Object.assign(doc, payload);
    await doc.save();
    await writeAudit(req, 'Coupon_updated', 'Coupon', doc._id);
    return success(res, { message: 'Coupon updated', data: doc });
  }),
  remove: asyncHandler(async (req, res) => {
    const doc = await Coupon.findOne({ _id: req.params.id, deletedAt: null });
    if (!doc) throw new ApiError(404, 'Coupon not found');
    doc.deletedOriginalCode = doc.code; doc.code = `DELETED-${String(doc._id).toUpperCase()}`; doc.active = false; doc.deletedAt = new Date(); await doc.save();
    await writeAudit(req, 'Coupon_deleted', 'Coupon', doc._id);
    return success(res, { message: 'Coupon deleted' });
  }),
};

export const promotionCrud = {
  list: asyncHandler(async (req, res) => {
    const filter = req.query.includeDeleted === 'true' ? {} : { deletedAt: null };
    const data = await Promotion.find(filter).populate('products', 'name slug').populate('categories', 'name slug').populate('bundles', 'name slug').populate('bundle', 'name slug').sort({ createdAt: -1 }).lean();
    return success(res, { data });
  }),
  get: asyncHandler(async (req, res) => {
    const doc = await Promotion.findOne({ _id: req.params.id, deletedAt: null }).populate('products', 'name slug').populate('categories', 'name slug').populate('bundles', 'name slug').lean();
    if (!doc) throw new ApiError(404, 'Promotion not found');
    return success(res, { data: doc });
  }),
  create: asyncHandler(async (req, res) => {
    const payload = await ensurePromotionReferences(req.body);
    const doc = await Promotion.create(payload);
    await writeAudit(req, 'Promotion_created', 'Promotion', doc._id);
    return success(res, { status: 201, message: 'Promotion created', data: doc });
  }),
  update: asyncHandler(async (req, res) => {
    const doc = await Promotion.findOne({ _id: req.params.id, deletedAt: null });
    if (!doc) throw new ApiError(404, 'Promotion not found');
    const payload = await ensurePromotionReferences(req.body);
    Object.assign(doc, payload);
    await doc.save();
    await writeAudit(req, 'Promotion_updated', 'Promotion', doc._id);
    return success(res, { message: 'Promotion updated', data: doc });
  }),
  remove: asyncHandler(async (req, res) => {
    const doc = await Promotion.findOne({ _id: req.params.id, deletedAt: null });
    if (!doc) throw new ApiError(404, 'Promotion not found');
    doc.active = false; doc.deletedAt = new Date(); await doc.save();
    await writeAudit(req, 'Promotion_deleted', 'Promotion', doc._id);
    return success(res, { message: 'Promotion deleted' });
  }),
};

const crud = (Model, resource, normalize=(x)=>x) => ({
  list: asyncHandler(async (_req,res)=>success(res,{data:await Model.find().sort({createdAt:-1}).lean()})),
  get: asyncHandler(async (req,res)=>{const doc=await Model.findById(req.params.id).lean();if(!doc) throw new ApiError(404,`${resource} not found`);return success(res,{data:doc});}),
  create: asyncHandler(async (req,res)=>{ const doc=await Model.create(normalize(req.body)); await writeAudit(req,`${resource}_created`,resource,doc._id); return success(res,{status:201,message:`${resource} created`,data:doc}); }),
  update: asyncHandler(async (req,res)=>{ const doc=await Model.findByIdAndUpdate(req.params.id,normalize(req.body),{new:true,runValidators:true}); if(!doc) throw new ApiError(404,`${resource} not found`); await writeAudit(req,`${resource}_updated`,resource,doc._id); return success(res,{message:`${resource} updated`,data:doc}); }),
  remove: asyncHandler(async (req,res)=>{ const doc=await Model.findById(req.params.id); if(!doc) throw new ApiError(404,`${resource} not found`); if('active' in doc) doc.active=false; else if('status' in doc) doc.status='archived'; else await doc.deleteOne(); if(doc.$isDeleted?.()!==true) await doc.save().catch(()=>{}); await writeAudit(req,`${resource}_disabled`,resource,doc._id); return success(res,{message:`${resource} disabled`}); }),
});
export const roleCrud=crud(Role,'Role',(b)=>({ ...b, ...((b.slug !== undefined || b.name !== undefined) ? { slug: toSlug(b.slug || b.name) } : {}) }));

export const adminReviews=asyncHandler(async(req,res)=>{ const q={}; if(req.query.status) q.status=req.query.status; const data=await Review.find(q).populate('user','name email').populate('product','name slug').sort({createdAt:-1}).limit(200).lean(); return success(res,{data}); });
export const moderateReview=asyncHandler(async(req,res)=>{ const r=await Review.findByIdAndUpdate(req.params.id,{$set:{status:req.body.status}},{new:true}); if(!r) throw new ApiError(404,'Review not found'); return success(res,{message:'Review status updated',data:r}); });

export const adminTickets=asyncHandler(async(req,res)=>{ const q={}; if(req.query.status) q.status=req.query.status; const data=await SupportTicket.find(q).populate('user','name email').sort({lastReplyAt:-1}).limit(200).lean(); return success(res,{data}); });
export const adminTicket=asyncHandler(async(req,res)=>{ const t=await SupportTicket.findById(req.params.id).populate('user','name email phone').populate('messages.sender','name role').lean(); if(!t) throw new ApiError(404,'Ticket not found'); return success(res,{data:t}); });
export const adminReplyTicket=asyncHandler(async(req,res)=>{ const t=await SupportTicket.findById(req.params.id); if(!t) throw new ApiError(404,'Ticket not found'); t.messages.push({sender:req.user._id,message:req.body.message,isAdmin:true}); t.lastReplyAt=new Date(); t.status=req.body.status||'waiting_customer'; await t.save(); await notifyUser(t.user,'support','Support replied to your ticket',`There is a new reply on ${t.ticketNumber}.`,`/account/support`); return success(res,{message:'Reply sent',data:t}); });
export const adminTicketStatus=asyncHandler(async(req,res)=>{ const t=await SupportTicket.findByIdAndUpdate(req.params.id,{$set:{status:req.body.status,priority:req.body.priority||undefined}},{new:true}); if(!t) throw new ApiError(404,'Ticket not found'); return success(res,{message:'Ticket updated',data:t}); });

export const adminRefunds=asyncHandler(async(req,res)=>success(res,{data:await RefundRequest.find().populate('user','name email').populate('order','orderNumber total status payment').sort({createdAt:-1}).lean()}));
export const resolveRefund=asyncHandler(async(req,res)=>{ const r=await RefundRequest.findById(req.params.id); if(!r) throw new ApiError(404,'Refund request not found'); r.status=req.body.status; r.adminNote=req.body.adminNote||''; if(['approved','rejected','completed'].includes(r.status)){r.resolvedBy=req.user._id;r.resolvedAt=new Date();} await r.save(); if(req.body.creditWallet && r.status==='completed') await creditWallet(r.user,r.requestedAmount,'refund',r.order,`Refund for order ${r.order}`); await notifyUser(r.user,'refund',`Refund ${r.status}`,`Your refund request is now ${r.status}.`,'/account/refunds'); return success(res,{message:'Refund updated',data:r}); });

export const adminNotifications=asyncHandler(async(_req,res)=>{ await ensureAdminOperationalAlerts().catch(()=>{}); return success(res,{data:await Notification.find().sort({createdAt:-1}).limit(200).lean()}); });
export const createNotification=asyncHandler(async(req,res)=>{ const n=await Notification.create(req.body); return success(res,{status:201,message:'In-app notification created',data:n}); });

export const abandonedCarts=asyncHandler(async(_req,res)=>{ const threshold=new Date(Date.now()-24*3600000); await Cart.updateMany({status:'active','items.0':{$exists:true},lastActivityAt:{$lt:threshold}},{$set:{status:'abandoned'}}); const data=await Cart.find({status:'abandoned','items.0':{$exists:true}}).populate('user','name email phone').populate('items.product','name slug thumbnail').populate('items.bundle','name slug image').sort({lastActivityAt:1}).limit(200).lean(); return success(res,{data}); });

export const assignRole=asyncHandler(async(req,res)=>{ const user=await User.findById(req.params.userId); if(!user) throw new ApiError(404,'User not found'); const role=req.body.roleId?await Role.findById(req.body.roleId):null; user.roleRef=role?._id||null; user.permissions=role?.permissions||req.body.permissions||[]; if(req.body.baseRole) user.role=req.body.baseRole; await user.save({validateBeforeSave:false}); return success(res,{message:'Role and permissions updated',data:user.toPublicJSON()}); });
export const adjustWallet=asyncHandler(async(req,res)=>{ const amount=Number(req.body.amount||0); if(amount<=0) throw new ApiError(400,'Amount must be positive'); if(req.body.type==='credit') await creditWallet(req.params.userId,amount,'admin',null,req.body.note||'Admin adjustment'); else { const user=await User.findOneAndUpdate({_id:req.params.userId,walletBalance:{$gte:amount}},{$inc:{walletBalance:-amount}},{new:true}); if(!user) throw new ApiError(409,'Insufficient wallet balance'); await WalletTransaction.create({user:user._id,type:'debit',amount,source:'admin',note:req.body.note||'Admin adjustment',balanceAfter:user.walletBalance}); } return success(res,{message:'Wallet updated'}); });

export const siteSettings=asyncHandler(async(_req,res)=>success(res,{data:await getSettings()}));
export const updateSiteSettings=asyncHandler(async(req,res)=>{
  const {_id,__v,createdAt,updatedAt,key,webhooks,...safe}=req.body||{};
  const doc=await SiteSettings.findOneAndUpdate(
    {key:'global'},
    {$set:safe},
    {upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true}
  );
  await writeAudit(req,'site_settings_updated','SiteSettings',doc._id);
  return success(res,{message:'Site settings updated',data:doc});
});

export const backupExport=asyncHandler(async(_req,res)=>{ const [products,categories,payments,settings,bundles,coupons,promotions,banners,roles]=await Promise.all([Product.find().lean(),Category.find().lean(),PaymentMethod.find().lean(),getSettings(),Bundle.find().lean(),Coupon.find().lean(),Promotion.find().lean(),Banner.find().lean(),Role.find().lean()]); res.setHeader('Content-Disposition',`attachment; filename="hexa-backup-${new Date().toISOString().slice(0,10)}.json"`); return res.json({version:2,exportedAt:new Date().toISOString(),scope:'catalog-and-configuration',data:{products,categories,paymentMethods:payments,settings,bundles,coupons,promotions,banners,roles}}); });

export const backupRestore=asyncHandler(async(req,res)=>{
  const backup=req.body?.data?req.body:req.body?.backup;
  if(!backup?.data || ![1,2].includes(Number(backup.version))) throw new ApiError(400,'Invalid HEXA backup file');
  const data=backup.data;
  const upsertMany=async(Model,rows=[],key='_id')=>{for(const row of rows){const clean={...row};delete clean.__v;const filter=clean[key]?{[key]:clean[key]}:{_id:clean._id};await Model.updateOne(filter,{$set:clean},{upsert:true,runValidators:false});}};
  await upsertMany(Category,data.categories||[]);
  await upsertMany(Product,data.products||[]);
  await upsertMany(PaymentMethod,data.paymentMethods||[],'slug');
  await upsertMany(Bundle,data.bundles||[],'slug');
  await upsertMany(Coupon,data.coupons||[],'code');
  await upsertMany(Promotion,data.promotions||[]);
  await upsertMany(Banner,data.banners||[]);
  await upsertMany(Role,data.roles||[],'slug');
  if(data.settings){const settings=data.settings.toObject?data.settings.toObject():data.settings;delete settings._id;delete settings.__v;delete settings.webhooks;await SiteSettings.findOneAndUpdate({key:'global'},{$set:settings},{upsert:true,new:true,runValidators:false});}
  await writeAudit(req,'backup_restored','System',null,{version:backup.version,scope:backup.scope||'legacy'});
  return success(res,{message:'Catalog and configuration backup restored'});
});

export const growthAnalytics=asyncHandler(async(_req,res)=>{
  const since30=new Date(Date.now()-30*86400000); const since7=new Date(Date.now()-7*86400000);
  const [newUsers30,orders30,revenueAgg,wishlistUsers,abandoned,ticketsOpen,refundPending,activeSubs,views]=await Promise.all([
    User.countDocuments({createdAt:{$gte:since30}}),Order.countDocuments({createdAt:{$gte:since30}}),Order.aggregate([{$match:{createdAt:{$gte:since30},'payment.status':'verified'}},{$group:{_id:null,revenue:{$sum:'$total'},orders:{$sum:1}}}]),User.countDocuments({'wishlist.0':{$exists:true}}),Cart.countDocuments({status:'abandoned'}),SupportTicket.countDocuments({status:{$in:['open','in_progress','waiting_customer']}}),RefundRequest.countDocuments({status:{$in:['requested','reviewing']}}),Subscription.countDocuments({status:'active'}),ActivityLog.countDocuments({type:'product_viewed',createdAt:{$gte:since7}})
  ]);
  return success(res,{data:{newUsers30,orders30,revenue30:revenueAgg[0]?.revenue||0,verifiedOrders30:revenueAgg[0]?.orders||0,wishlistUsers,abandonedCarts:abandoned,openTickets:ticketsOpen,pendingRefunds:refundPending,activeSubscriptions:activeSubs,productViews7:views}});
});

export const adminPayouts = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status && req.query.status.trim()) query.status = req.query.status.trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const result = await paginateWithCursor(AffiliatePayout, query, {
    limit,
    cursor: req.query.cursor,
    direction: req.query.direction,
    populate: [
      { path: 'user', select: 'name email phone referralCode walletBalance' },
      { path: 'processedBy', select: 'name email' },
    ],
    includeTotal: true,
  });
  return success(res, result);
});

export const processPayout = asyncHandler(async (req, res) => {
  const { status, adminNote = '', transactionReference = '' } = req.body;
  const payout = await AffiliatePayout.findById(req.params.id);
  if (!payout) throw new ApiError(404, 'Payout request not found');

  const previousStatus = payout.status;
  payout.status = status;
  payout.adminNote = adminNote;
  payout.transactionReference = transactionReference;
  payout.processedBy = req.user._id;
  payout.processedAt = new Date();
  await payout.save();

  // If rejected and previously was pending/processing, refund the balance back to user's wallet
  if (status === 'rejected' && ['pending', 'processing'].includes(previousStatus)) {
    const user = await User.findById(payout.user);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + payout.amount;
      await user.save({ validateBeforeSave: false });

      await WalletTransaction.create({
        user: user._id,
        type: 'credit',
        amount: payout.amount,
        source: 'payout_refund',
        note: `Refund for rejected payout: ${adminNote || 'Payout request rejected'}`,
        balanceAfter: user.walletBalance,
      });

      await notifyUser(
        user._id,
        'payout_rejected',
        '❌ Payout Request Rejected',
        `Your payout request for ৳${payout.amount} was rejected. Amount has been refunded to your wallet balance. Reason: ${adminNote || 'Contact support'}`,
        '/account'
      ).catch(() => {});
    }
  } else if (status === 'approved') {
    await notifyUser(
      payout.user,
      'payout_approved',
      '✅ Affiliate Payout Approved & Sent',
      `Your payout of ৳${payout.amount} has been approved and sent via ${payout.paymentMethod.toUpperCase()} (${payout.accountNumber}). Ref: ${transactionReference || 'Complete'}`,
      '/account'
    ).catch(() => {});
  }

  await writeAudit(req, 'affiliate_payout_processed', 'AffiliatePayout', payout._id, { status, amount: payout.amount });
  return success(res, { message: `Payout request marked as ${status}`, data: payout });
});

export const listFraudBlocks = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.type && req.query.type.trim()) query.type = req.query.type.trim();
  if (req.query.q && req.query.q.trim()) {
    const regex = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ value: regex }, { reason: regex }];
  }
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const result = await paginateWithCursor(FraudBlock, query, {
    limit,
    cursor: req.query.cursor,
    direction: req.query.direction,
    populate: { path: 'createdBy', select: 'name email' },
    includeTotal: true,
  });
  return success(res, result);
});

export const createFraudBlock = asyncHandler(async (req, res) => {
  const { type, value, reason, expiresAt } = req.body;
  const cleanValue = String(value).toLowerCase().trim().replace(/[\s-]/g, '');

  const block = await FraudBlock.findOneAndUpdate(
    { type, value: cleanValue },
    {
      $set: {
        reason: reason || 'Fraud prevention / security restriction',
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: req.user._id,
      },
    },
    { upsert: true, new: true }
  );

  await writeAudit(req, 'fraud_block_created', 'FraudBlock', block._id, { type, value: cleanValue, reason });
  return success(res, { status: 201, message: `${type.toUpperCase()} added to security blacklist`, data: block });
});

export const removeFraudBlock = asyncHandler(async (req, res) => {
  const block = await FraudBlock.findById(req.params.id);
  if (!block) throw new ApiError(404, 'Fraud block entry not found');
  await block.deleteOne();
  await writeAudit(req, 'fraud_block_removed', 'FraudBlock', block._id, { value: block.value });
  return success(res, { message: 'Security restriction removed' });
});

export const toggleFraudBlock = asyncHandler(async (req, res) => {
  const block = await FraudBlock.findById(req.params.id);
  if (!block) throw new ApiError(404, 'Fraud block entry not found');
  block.isActive = !block.isActive;
  await block.save();
  return success(res, { message: `Fraud block ${block.isActive ? 'activated' : 'deactivated'}`, data: block });
});
