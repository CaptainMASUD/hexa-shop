import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import InventoryItem from '../models/InventoryItem.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { prepareOrder, reserveInventory, releaseInventory, finalizeInventory, nextOrderNumber, expandOrderItemsForInventory } from '../services/orderService.js';
import { encryptJson, decryptJson } from '../utils/encryption.js';
import { writeAudit } from '../services/auditService.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import CouponUserUsage from '../models/CouponUserUsage.js';
import { autoDeliverEligibleItems } from '../services/autoDeliveryService.js';
import { autoFulfillEligibleItems } from '../services/fulfillmentService.js';
import { createSubscriptionsForOrder } from '../services/subscriptionService.js';
import { awardDeliveredOrder } from '../services/rewardService.js';
import { notifyUser, notifyAdmins } from '../services/notificationService.js';
import { emitWebhook } from '../services/webhookService.js';

const userOrderView = async (id, userId) => {
  const order = await Order.findOne({ _id: id, user: userId }).select('+deliveries').lean();
  if (!order) throw new ApiError(404, 'Order not found');
  order.deliveries = (order.deliveries || []).map((delivery) => ({
    ...delivery,
    details: decryptJson(delivery.encryptedPayload),
    encryptedPayload: undefined,
  }));
  return order;
};

export const createOrder = asyncHandler(async (req, res) => {
  const prepared = await prepareOrder({ cartItems: req.body.items, paymentMethodId: req.body.paymentMethodId, customer: req.body.customer, userId: req.user._id, couponCode: req.body.couponCode, bundleId: req.body.bundleId, walletAmount: req.body.walletAmount, loyaltyPoints: req.body.loyaltyPoints });
  await reserveInventory(prepared.inventoryItems, req.user._id);
  const benefitUpdate = {};
  if (prepared.walletApplied) benefitUpdate.walletBalance = -prepared.walletApplied;
  if (prepared.loyaltyPointsRedeemed) benefitUpdate.loyaltyPoints = -prepared.loyaltyPointsRedeemed;
  if (Object.keys(benefitUpdate).length) {
    const filter = { _id: req.user._id };
    if (prepared.walletApplied) filter.walletBalance = { $gte: prepared.walletApplied };
    if (prepared.loyaltyPointsRedeemed) filter.loyaltyPoints = { $gte: prepared.loyaltyPointsRedeemed };
    const updated = await User.findOneAndUpdate(filter, { $inc: benefitUpdate }, { new: true });
    if (!updated) {
      await releaseInventory(prepared.inventoryItems, req.user._id, null, 'Order benefits rollback', { strict: false });
      throw new ApiError(409, 'Wallet or loyalty balance changed. Please review checkout.');
    }
  }

  let order;
  let couponClaimed = false;
  try {
    order = await Order.create({
      orderNumber: await nextOrderNumber(),
      user: req.user._id,
      items: prepared.items,
      subtotal: prepared.subtotal,
      discount: prepared.discount,
      coupon: prepared.coupon,
      bundle: prepared.bundle,
      bundles: prepared.bundles,
      promotion: prepared.promotion,
      walletApplied: prepared.walletApplied,
      loyaltyPointsRedeemed: prepared.loyaltyPointsRedeemed,
      total: prepared.total,
      currency: prepared.currency,
      customer: prepared.customer,
      payment: {
        methodId: prepared.method._id,
        methodName: prepared.method.name,
        paymentAccountNumber: prepared.method.accountNumber || '',
        accountType: prepared.method.accountType || '',
        accountName: prepared.method.accountName || '',
        branchName: prepared.method.branchName || '',
        chargeNote: prepared.method.chargeNote || '',
        instructions: prepared.method.instructions || '',
        senderNumber: req.body.senderNumber || (prepared.total === 0 ? 'WALLET' : ''),
        transactionId: req.body.transactionId || (prepared.total === 0 ? `WALLET-${Date.now()}` : ''),
        status: 'pending',
      },
      status: 'payment_verification',
      inventoryState: 'reserved',
      timeline: [
        { event: 'Order Placed', status: 'pending', actor: req.user._id },
        { event: 'Payment Submitted', status: 'payment_verification', actor: req.user._id },
      ],
    });

    if (prepared.coupon?.couponId) {
      const coupon = await Coupon.findOne({ _id: prepared.coupon.couponId, active: true, deletedAt: null });
      if (!coupon) throw new ApiError(409, 'Coupon became unavailable. Please review checkout.');

      const historicalUses = await CouponUsage.countDocuments({ coupon: coupon._id, user: req.user._id });
      try {
        await CouponUserUsage.updateOne(
          { coupon: coupon._id, user: req.user._id },
          { $setOnInsert: { count: historicalUses } },
          { upsert: true },
        );
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
      const userClaim = await CouponUserUsage.findOneAndUpdate(
        { coupon: coupon._id, user: req.user._id, count: { $lt: coupon.perUserLimit } },
        { $inc: { count: 1 } },
        { new: true },
      );
      if (!userClaim) throw new ApiError(409, 'Coupon per-user usage limit was reached. Please review checkout.');

      const claimFilter = { _id: coupon._id, active: true, deletedAt: null };
      if (coupon.usageLimit > 0) claimFilter.usedCount = { $lt: coupon.usageLimit };
      const claimed = await Coupon.findOneAndUpdate(claimFilter, { $inc: { usedCount: 1 } }, { new: true });
      if (!claimed) {
        await CouponUserUsage.updateOne({ coupon: coupon._id, user: req.user._id, count: { $gt: 0 } }, { $inc: { count: -1 } });
        throw new ApiError(409, 'Coupon usage limit was reached. Please review checkout.');
      }
      couponClaimed = true;
      await CouponUsage.create({ coupon: coupon._id, user: req.user._id, order: order._id, discount: prepared.coupon.discount });
    }

    await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [], status: 'converted', lastActivityAt: new Date() } });
  } catch (error) {
    if (order?._id) await Order.deleteOne({ _id: order._id }).catch(() => {});
    if (couponClaimed && prepared.coupon?.couponId) {
      await Coupon.updateOne({ _id: prepared.coupon.couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }).catch(() => {});
      await CouponUserUsage.updateOne({ coupon: prepared.coupon.couponId, user: req.user._id, count: { $gt: 0 } }, { $inc: { count: -1 } }).catch(() => {});
      await CouponUsage.deleteOne({ order: order?._id }).catch(() => {});
    }
    await releaseInventory(prepared.inventoryItems, req.user._id, null, 'Order creation rollback', { strict: false });
    await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { status: 'active', lastActivityAt: new Date() } }).catch(() => {});
    const restore = {};
    if (prepared.walletApplied) restore.walletBalance = prepared.walletApplied;
    if (prepared.loyaltyPointsRedeemed) restore.loyaltyPoints = prepared.loyaltyPointsRedeemed;
    if (Object.keys(restore).length) await User.updateOne({ _id: req.user._id }, { $inc: restore });
    throw error;
  }

  await writeAudit(req, 'order_created', 'Order', order._id, { orderNumber: order.orderNumber, total: order.total });
  emitWebhook('order.created', { orderId: order._id, orderNumber: order.orderNumber, total: order.total, userId: order.user }).catch(() => {});
  await notifyAdmins('new_order', 'New order received', `${order.orderNumber} is awaiting payment verification.`, '/admin/orders', { orderId: order._id });
  return success(res, { status: 201, message: 'Order placed and awaiting payment verification', data: order });
});

export const myOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id }).select('-internalNotes -deliveries').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments({ user: req.user._id }),
  ]);
  return success(res, { data: orders, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const myOrder = asyncHandler(async (req, res) => success(res, { data: await userOrderView(req.params.id, req.user._id) }));

export const adminOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 80)));
  const filter = {};
  if (req.query.status && req.query.status.trim()) filter.status = req.query.status.trim();
  if (req.query.paymentStatus && req.query.paymentStatus.trim()) filter['payment.status'] = req.query.paymentStatus.trim();
  if (req.query.q && req.query.q.trim()) {
    const regex = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { orderNumber: regex },
      { 'customer.email': regex },
      { 'customer.name': regex },
      { 'customer.phone': regex },
      { 'payment.transactionId': regex },
      { 'payment.senderNumber': regex },
      { 'payment.methodName': regex },
      { 'items.productName': regex },
    ];
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return success(res, { data: orders, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const adminOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+internalNotes +deliveries').populate('user', 'name email phone').lean();
  if (!order) throw new ApiError(404, 'Order not found');
  order.deliveries = (order.deliveries || []).map((delivery) => ({ ...delivery, details: decryptJson(delivery.encryptedPayload), encryptedPayload: undefined }));
  return success(res, { data: order });
});

const restoreOrderBenefits = async (order) => {
  if (order.rewardsRestored) return;
  const inc = {};
  if (order.walletApplied > 0) inc.walletBalance = order.walletApplied;
  if (order.loyaltyPointsRedeemed > 0) inc.loyaltyPoints = order.loyaltyPointsRedeemed;
  if (Object.keys(inc).length) await User.updateOne({ _id: order.user }, { $inc: inc });
  if (order.coupon?.couponId) {
    await Coupon.updateOne({ _id: order.coupon.couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    const usage = await CouponUsage.findOne({ order: order._id }).select('user coupon').lean();
    await CouponUsage.deleteOne({ order: order._id });
    if (usage) await CouponUserUsage.updateOne({ coupon: usage.coupon, user: usage.user, count: { $gt: 0 } }, { $inc: { count: -1 } });
  }
  order.rewardsRestored = true;
};

const completeDeliveredOrder = async (order, actorId) => {
  if (!order.inventoryReleased && order.inventoryState !== 'finalized' && order.inventoryState !== 'released') {
    await finalizeInventory(expandOrderItemsForInventory(order.items));
    order.inventoryState = 'finalized';
    order.inventoryReleased = true;
  }
  order.status = 'delivered';
  await createSubscriptionsForOrder(order).catch(() => {});
  await awardDeliveredOrder(order).catch(() => {});
  order.timeline.push({ event: 'Order Delivered', status: 'delivered', actor: actorId });
  await notifyUser(order.user, 'order_delivered', 'Your HEXA order is ready', `${order.orderNumber} has been delivered.`, `/account/orders/${order._id}`).catch(() => {});
};

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+deliveries');
  if (!order) throw new ApiError(404, 'Order not found');
  const status = req.body.status;
  if (order.payment.status === status) return success(res, { message: `Payment already marked ${status}`, data: order });
  if (['rejected', 'refunded'].includes(order.payment.status) && status === 'verified') throw new ApiError(409, 'A rejected/refunded payment cannot be verified');
  order.payment.status = status;
  order.payment.verifiedAt = new Date();
  order.payment.verifiedBy = req.user._id;
  if (status === 'verified' && ['pending', 'payment_verification'].includes(order.status)) order.status = 'confirmed';
  if (status === 'rejected') order.status = 'rejected';
  if (status === 'refunded') order.status = 'refunded';
  order.timeline.push({ event: status === 'verified' ? 'Payment Verified' : `Payment ${status}`, status: order.status, note: req.body.note, actor: req.user._id });
  if (['rejected', 'refunded'].includes(status) && !order.inventoryReleased) {
    await releaseInventory(expandOrderItemsForInventory(order.items), req.user._id, order._id, `Payment ${status}`); order.inventoryState = 'released'; order.inventoryReleased = true; await restoreOrderBenefits(order);
  }
  if (status === 'verified') {
    await autoFulfillEligibleItems(order, req.user._id);
    await autoDeliverEligibleItems(order, req.user._id);
    await createSubscriptionsForOrder(order).catch(() => {});
    const deliveredIds = new Set((order.deliveries || []).map((d) => String(d.orderItemId)));
    if (order.items.every((item) => deliveredIds.has(String(item._id)))) await completeDeliveredOrder(order, req.user._id);
    else if (order.status === 'confirmed') order.status = 'processing';
    await notifyUser(order.user, 'payment_verified', 'Payment verified', `${order.orderNumber} payment is verified and fulfillment has started.`, `/account/orders/${order._id}`);
  }
  await order.save();
  emitWebhook('order.payment_updated', { orderId: order._id, orderNumber: order.orderNumber, paymentStatus: status, status: order.status }).catch(() => {});
  await writeAudit(req, `payment_${status}`, 'Order', order._id, { orderNumber: order.orderNumber });
  return success(res, { message: `Payment marked ${status}`, data: order });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+deliveries');
  if (!order) throw new ApiError(404, 'Order not found');
  const status = req.body.status;
  if (order.status === status) return success(res, { message: `Order already ${status}`, data: order });
  if (['cancelled', 'rejected', 'refunded'].includes(order.status) && status !== 'refunded') throw new ApiError(409, `Cannot move a ${order.status} order to ${status}`);
  if (status === 'delivered' && order.payment.status !== 'verified') throw new ApiError(409, 'Verify payment before marking an order delivered');
  if (['cancelled', 'rejected', 'refunded'].includes(status) && !order.inventoryReleased) {
    await releaseInventory(expandOrderItemsForInventory(order.items), req.user._id, order._id, `Order ${status}`);
    order.inventoryState = 'released'; order.inventoryReleased = true; await restoreOrderBenefits(order);
  }
  if (status === 'delivered') {
    await completeDeliveredOrder(order, req.user._id);
  } else {
    order.status = status;
    if (['confirmed', 'processing'].includes(status)) {
      await createSubscriptionsForOrder(order).catch(() => {});
    }
    order.timeline.push({ event: `Order ${status}`, status, note: req.body.note, actor: req.user._id });
  }
  await order.save();
  emitWebhook('order.status_updated', { orderId: order._id, orderNumber: order.orderNumber, status }).catch(() => {});
  await writeAudit(req, 'order_status_changed', 'Order', order._id, { orderNumber: order.orderNumber, status });
  if (status !== 'delivered') await notifyUser(order.user, 'order_status', `Order ${status}`, `${order.orderNumber} is now ${status}.`, `/account/orders/${order._id}`);
  return success(res, { message: 'Order status updated', data: order });
});

export const updateInternalNote = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+internalNotes');
  if (!order) throw new ApiError(404, 'Order not found');
  order.internalNotes = req.body.note;
  await order.save();
  await writeAudit(req, 'order_note_updated', 'Order', order._id, { orderNumber: order.orderNumber });
  return success(res, { message: 'Internal note updated' });
});

export const deliverOrderItem = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+deliveries');
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.payment.status !== 'verified') throw new ApiError(409, 'Verify payment before delivering credentials');
  const item = order.items.id(req.body.orderItemId);
  if (!item) throw new ApiError(404, 'Order item not found');

  const existingDeliveryIndex = (order.deliveries || []).findIndex((d) => String(d.orderItemId) === String(item._id));
  const isUpdating = existingDeliveryIndex !== -1;

  let details = req.body.details;
  const requestedInventoryIds = [...new Set([req.body.inventoryItemId, ...(req.body.inventoryItemIds || [])].filter(Boolean).map(String))];
  const claimedInventoryIds = [];

  try {
    if (requestedInventoryIds.length) {
      const expected = new Map();
      const addExpected = (productId, variantId, quantity) => {
        const key = `${String(productId)}:${String(variantId || '')}`;
        expected.set(key, (expected.get(key) || 0) + Number(quantity || 0));
      };
      if ((item.itemType || 'product') === 'bundle') {
        for (const component of item.components || []) addExpected(component.productId, component.variantId, Number(component.quantityPerBundle || 1) * Number(item.quantity || 1));
      } else addExpected(item.productId, item.variantId, item.quantity);

      const expectedCount = [...expected.values()].reduce((sum, quantity) => sum + quantity, 0);
      if (requestedInventoryIds.length !== expectedCount) throw new ApiError(422, `This order item requires ${expectedCount} inventory credential item(s)`);
      const candidates = await InventoryItem.find({ _id: { $in: requestedInventoryIds }, status: 'available' }).select('product variantId');
      if (candidates.length !== requestedInventoryIds.length) throw new ApiError(409, 'One or more selected inventory items are unavailable');

      const remaining = new Map(expected);
      for (const inventory of candidates) {
        const key = `${String(inventory.product)}:${String(inventory.variantId || '')}`;
        const left = remaining.get(key) || 0;
        if (left <= 0) throw new ApiError(409, 'An inventory item does not match this product/bundle configuration');
        remaining.set(key, left - 1);
      }
      if ([...remaining.values()].some((left) => left !== 0)) throw new ApiError(409, 'Selected inventory items do not fully match this product/bundle');

      const assignedPayloads = [];
      for (const inventoryId of requestedInventoryIds) {
        const claimed = await InventoryItem.findOneAndUpdate(
          { _id: inventoryId, status: 'available' },
          { $set: { status: 'assigned', assignedToUser: order.user, reservedForOrder: order._id, assignedAt: new Date() } },
          { new: true },
        ).select('+encryptedPayload');
        if (!claimed) throw new ApiError(409, 'An inventory item was assigned by another request. Please retry.');
        claimedInventoryIds.push(claimed._id);
        assignedPayloads.push({ productId: claimed.product, variantId: claimed.variantId || null, details: decryptJson(claimed.encryptedPayload) });
      }
      details = assignedPayloads.length === 1 ? assignedPayloads[0].details : { units: assignedPayloads };
    }

    if (isUpdating) {
      order.deliveries[existingDeliveryIndex].summary = req.body.summary || order.deliveries[existingDeliveryIndex].summary;
      order.deliveries[existingDeliveryIndex].encryptedPayload = encryptJson(details);
      order.deliveries[existingDeliveryIndex].deliveredAt = new Date();
      order.deliveries[existingDeliveryIndex].deliveredBy = req.user._id;
      order.timeline.push({ event: 'Credentials Updated', status: order.status, note: `Updated delivery credentials for ${item.productName}`, actor: req.user._id });
      
      const deliveredIds = new Set((order.deliveries || []).map((entry) => String(entry.orderItemId)));
      if (req.body.markDelivered || (order.status !== 'delivered' && order.items.every((entry) => deliveredIds.has(String(entry._id))))) {
        await completeDeliveredOrder(order, req.user._id);
      }
      await order.save();
      await createSubscriptionsForOrder(order).catch(() => {});
      await writeAudit(req, 'credentials_updated', 'Order', order._id, { orderNumber: order.orderNumber, orderItemId: item._id });
      await notifyUser(order.user, 'order_delivery_updated', 'Delivery credentials updated', `Updated credentials for ${item.productName} are now available in your account.`, `/account/orders/${order._id}`);
      return success(res, { message: 'Delivery credentials successfully updated for the customer' });
    }

    const delivery = {
      orderItemId: item._id,
      summary: req.body.summary || 'Digital delivery',
      encryptedPayload: encryptJson(details),
      deliveredBy: req.user._id,
      deliveredAt: new Date(),
    };
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, 'payment.status': 'verified', deliveries: { $not: { $elemMatch: { orderItemId: item._id } } } },
      { $push: { deliveries: delivery, timeline: { event: 'Credentials Assigned', status: 'processing', actor: req.user._id } }, $set: { status: 'processing' } },
      { new: true },
    ).select('+deliveries');
    if (!updated) throw new ApiError(409, 'This order item was already delivered by another request');

    await createSubscriptionsForOrder(updated).catch(() => {});

    const deliveredIds = new Set((updated.deliveries || []).map((entry) => String(entry.orderItemId)));
    if (req.body.markDelivered || updated.items.every((entry) => deliveredIds.has(String(entry._id)))) {
      await completeDeliveredOrder(updated, req.user._id);
      await updated.save();
    }
    emitWebhook('order.delivery_assigned', { orderId: updated._id, orderNumber: updated.orderNumber, orderItemId: item._id }).catch(() => {});
    await writeAudit(req, 'credentials_delivered', 'Order', updated._id, { orderNumber: updated.orderNumber, orderItemId: item._id });
    return success(res, { message: 'Delivery details securely assigned to the customer' });
  } catch (error) {
    if (claimedInventoryIds.length) {
      await InventoryItem.updateMany(
        { _id: { $in: claimedInventoryIds }, reservedForOrder: order._id },
        { $set: { status: 'available', assignedToUser: null, reservedForOrder: null, assignedAt: null } },
      ).catch(() => {});
    }
    throw error;
  }
});


export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (!['pending', 'payment_verification'].includes(order.status) || order.payment.status === 'verified') throw new ApiError(409, 'This order can no longer be cancelled directly');
  if (!order.inventoryReleased && order.inventoryState !== 'released' && order.inventoryState !== 'finalized') { await releaseInventory(expandOrderItemsForInventory(order.items), req.user._id, order._id, 'Customer cancellation'); order.inventoryState = 'released'; order.inventoryReleased = true; }
  await restoreOrderBenefits(order); order.status = 'cancelled'; order.timeline.push({ event: 'Order cancelled by customer', status: 'cancelled', actor: req.user._id }); await order.save();
  await notifyAdmins('order_cancelled', 'Order cancelled', `${order.orderNumber} was cancelled by the customer.`, '/admin/orders', { orderId: order._id });
  return success(res, { message: 'Order cancelled', data: order });
});
