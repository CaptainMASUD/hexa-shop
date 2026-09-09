import RestockAlert from '../models/RestockAlert.js';
import Product from '../models/Product.js';
import { notifyUser } from './notificationService.js';

export const subscribeRestockAlert = async ({ productId, variantId, email, userId }) => {
  const alert = await RestockAlert.findOneAndUpdate(
    {
      product: productId,
      variantId: variantId || null,
      email: email.toLowerCase().trim(),
    },
    {
      $set: {
        status: 'pending',
        user: userId || null,
      },
    },
    { upsert: true, new: true }
  );
  return alert;
};

export const checkAndTriggerRestockAlerts = async (productId, variantId = null) => {
  try {
    const product = await Product.findById(productId).select('name slug stock status allowUnlimitedStock variants');
    if (!product || product.status !== 'active') return;

    let isAvailable = false;
    let variantName = '';

    if (product.allowUnlimitedStock) {
      isAvailable = true;
    } else if (variantId && product.variants?.length) {
      const v = product.variants.id(variantId);
      if (v && v.active && (v.unlimitedStock || v.stock > 0)) {
        isAvailable = true;
        variantName = v.name;
      }
    } else {
      isAvailable = product.stockStatus === 'in_stock' || product.stock > 0;
    }

    if (!isAvailable) return;

    const query = {
      product: productId,
      status: 'pending',
    };
    if (variantId) {
      query.$or = [{ variantId }, { variantId: null }];
    }

    const pendingAlerts = await RestockAlert.find(query).limit(100);
    if (!pendingAlerts.length) return;

    const targetUrl = `/products/${product.slug}`;
    const itemTitle = variantName ? `${product.name} (${variantName})` : product.name;

    for (const alert of pendingAlerts) {
      alert.status = 'notified';
      alert.notifiedAt = new Date();
      await alert.save();

      if (alert.user) {
        await notifyUser(
          alert.user,
          'restock_alert',
          `🎉 Back in Stock: ${itemTitle}`,
          `Good news! ${itemTitle} is now back in stock and available for purchase.`,
          targetUrl,
          { productId: product._id, variantId: alert.variantId }
        ).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Restock alert trigger error:', error);
  }
};
