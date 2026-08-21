import Product from '../models/Product.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import { notifyUser } from './notificationService.js';

const durationDays = (text = '', metadata = {}) => {
  if (Number(metadata.durationDays) > 0) return Number(metadata.durationDays);
  const m = String(text).match(/(\d+)\s*(day|week|month|year)/i);
  if (!m) {
    if (/year/i.test(text)) return 365;
    if (/6\s*month/i.test(text)) return 180;
    if (/3\s*month/i.test(text)) return 90;
    if (/month/i.test(text)) return 30;
    if (/week/i.test(text)) return 7;
    return 30;
  }
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith('day')) return n;
  if (unit.startsWith('week')) return n * 7;
  if (unit.startsWith('year')) return n * 365;
  return n * 30;
};

const isSubscriptionProduct = (product, entry) => {
  if (product?.productType === 'subscription' || entry?.productType === 'subscription') return true;
  const name = `${product?.name || ''} ${entry?.productName || ''} ${entry?.variantName || ''}`.toLowerCase();
  if (/(month|year|week|subscription|membership|pass|netflix|spotify|chatgpt|vpn|prime|discord|canva|youtube|apple)/i.test(name)) {
    return true;
  }
  return false;
};

export const createSubscriptionsForOrder = async (order) => {
  if (!order?.items?.length) return;

  for (const orderItem of order.items) {
    const entries = (orderItem.itemType || 'product') === 'bundle'
      ? (orderItem.components || []).map((component) => ({
        orderItemId: orderItem._id,
        productId: component.productId,
        productName: component.productName,
        productType: component.productType,
        variantId: component.variantId || null,
        variantName: component.variantName || '',
        quantity: Number(component.quantityPerBundle || 1) * Number(orderItem.quantity || 1),
      }))
      : [{
        orderItemId: orderItem._id,
        productId: orderItem.productId,
        productName: orderItem.productName,
        productType: orderItem.productType,
        variantId: orderItem.variantId || null,
        variantName: orderItem.variantName || '',
        quantity: Number(orderItem.quantity || 1),
      }];

    for (const entry of entries) {
      if (!entry.productId) continue;
      const product = await Product.findById(entry.productId).select('name productType variants slug thumbnail');
      if (!isSubscriptionProduct(product, entry)) continue;

      const variant = entry.variantId && product?.variants ? product.variants.id(entry.variantId) : null;
      const durationString = variant?.duration || variant?.name || entry.variantName || product?.name || '';
      const days = durationDays(durationString, variant?.metadata || {});
      const expiresAt = new Date(Date.now() + days * 86400000);

      // One subscription record per purchased unit keeps bundle quantities accurate.
      for (let unit = 0; unit < (entry.quantity || 1); unit += 1) {
        await Subscription.findOneAndUpdate(
          {
            order: order._id,
            orderItemId: entry.orderItemId,
            product: entry.productId,
            variantId: entry.variantId || null,
            unitIndex: unit,
          },
          {
            $setOnInsert: {
              user: order.user,
              product: entry.productId,
              variantId: entry.variantId || null,
              productName: entry.productName || product?.name || 'Subscription',
              planName: entry.variantName || variant?.name || 'Standard Plan',
              startsAt: new Date(),
              expiresAt,
              status: 'active',
              unitIndex: unit,
            },
          },
          { upsert: true, new: true }
        );
      }
    }
  }
};

export const ensureExpiryNotifications = async (userId) => {
  const soon = new Date(Date.now() + 7 * 86400000);
  const subs = await Subscription.find({ user: userId, status: 'active', expiresAt: { $ne: null, $lte: soon, $gte: new Date() } }).lean();
  const cutoff = new Date(Date.now() - 24 * 3600000);
  for (const sub of subs) {
    const exists = await Notification.exists({
      user: userId,
      type: 'subscription_expiry',
      'metadata.subscriptionId': sub._id,
      createdAt: { $gte: cutoff },
    });
    if (!exists) {
      await notifyUser(
        userId,
        'subscription_expiry',
        `${sub.productName} expires soon`,
        `Your ${sub.planName || 'subscription'} expires on ${new Date(sub.expiresAt).toLocaleDateString()}.`,
        '/account/subscriptions',
        { subscriptionId: sub._id }
      ).catch(() => {});
    }
  }
};
