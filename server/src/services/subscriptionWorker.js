import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import Product from '../models/Product.js';
import { notifyUser } from './notificationService.js';

/**
 * Scan all active subscriptions and:
 * 1. Mark expired subscriptions as 'expired'.
 * 2. Send 3-day notice ('subscription_expiring_soon') with renewal target link.
 * 3. Send 24-hour notice ('subscription_expiring_today') with renewal target link.
 * 4. Send expired notice ('subscription_expired') with renewal target link.
 */
export const runSubscriptionExpiryCheck = async () => {
  try {
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 86400000);
    const oneDay = new Date(now.getTime() + 24 * 3600000);

    // 1. Process expired subscriptions
    const expiredSubs = await Subscription.find({
      status: 'active',
      expiresAt: { $ne: null, $lt: now },
    }).populate('product', 'slug name').limit(100);

    for (const sub of expiredSubs) {
      sub.status = 'expired';
      await sub.save();

      const renewLink = sub.product?.slug ? `/products/${sub.product.slug}` : '/account';
      await notifyUser(
        sub.user,
        'subscription_expired',
        `⚠️ Subscription Expired: ${sub.productName}`,
        `Your ${sub.planName || 'subscription'} expired on ${new Date(sub.expiresAt).toLocaleDateString()}. Click here to renew your plan.`,
        renewLink,
        { subscriptionId: sub._id, productId: sub.product?._id, variantId: sub.variantId }
      ).catch(() => {});
    }

    // 2. Process 24-hour notice
    const todaySubs = await Subscription.find({
      status: 'active',
      expiresAt: { $ne: null, $gte: now, $lte: oneDay },
    }).populate('product', 'slug name').limit(100);

    for (const sub of todaySubs) {
      const alreadyNotified = await Notification.exists({
        user: sub.user,
        type: 'subscription_expiring_today',
        'metadata.subscriptionId': sub._id,
        createdAt: { $gte: new Date(now.getTime() - 24 * 3600000) },
      });

      if (!alreadyNotified) {
        const renewLink = sub.product?.slug ? `/products/${sub.product.slug}` : '/account';
        await notifyUser(
          sub.user,
          'subscription_expiring_today',
          `🚨 Expiring Today: ${sub.productName}`,
          `Your ${sub.planName || 'subscription'} will expire within 24 hours. Renew now to avoid service interruption.`,
          renewLink,
          { subscriptionId: sub._id, productId: sub.product?._id, variantId: sub.variantId }
        ).catch(() => {});
      }
    }

    // 3. Process 3-day notice
    const soonSubs = await Subscription.find({
      status: 'active',
      expiresAt: { $ne: null, $gt: oneDay, $lte: threeDays },
    }).populate('product', 'slug name').limit(100);

    for (const sub of soonSubs) {
      const alreadyNotified = await Notification.exists({
        user: sub.user,
        type: 'subscription_expiring_soon',
        'metadata.subscriptionId': sub._id,
        createdAt: { $gte: new Date(now.getTime() - 3 * 86400000) },
      });

      if (!alreadyNotified) {
        const renewLink = sub.product?.slug ? `/products/${sub.product.slug}` : '/account';
        await notifyUser(
          sub.user,
          'subscription_expiring_soon',
          `📅 Renewal Reminder: ${sub.productName}`,
          `Your ${sub.planName || 'subscription'} expires on ${new Date(sub.expiresAt).toLocaleDateString()}. Click to renew ahead of time.`,
          renewLink,
          { subscriptionId: sub._id, productId: sub.product?._id, variantId: sub.variantId }
        ).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Subscription expiry worker error:', error);
  }
};

let workerInterval = null;

export const startSubscriptionWorker = (intervalMs = 60 * 60 * 1000) => {
  if (workerInterval) clearInterval(workerInterval);
  // Run once immediately on start after 5 seconds
  setTimeout(() => runSubscriptionExpiryCheck().catch(() => {}), 5000);
  // Then run periodically
  workerInterval = setInterval(() => runSubscriptionExpiryCheck().catch(() => {}), intervalMs);
  return workerInterval;
};

export const stopSubscriptionWorker = () => {
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = null;
};
