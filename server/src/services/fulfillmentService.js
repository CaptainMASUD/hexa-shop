import Product from '../models/Product.js';
import InventoryItem from '../models/InventoryItem.js';
import { decryptJson, encryptJson } from '../utils/encryption.js';
import { providerFactory } from './fulfillment/ProviderAdapterFactory.js';

/**
 * Atomically claims available inventory vault items for an order item.
 */
export const claimInventoryVaultItems = async ({ productId, variantId = null, quantity, itemType, order, actorId }) => {
  const query = {
    product: productId,
    variantId: variantId || null,
    status: 'available',
  };
  if (itemType) {
    query.itemType = itemType;
  }

  const candidates = await InventoryItem.find(query).select('_id').limit(quantity).lean();
  if (candidates.length < quantity) return [];

  const claimed = [];
  for (const candidate of candidates) {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: candidate._id, status: 'available' },
      {
        $set: {
          status: 'assigned',
          assignedToUser: order.user,
          reservedForOrder: order._id,
          assignedAt: new Date(),
        },
      },
      { new: true },
    ).select('+encryptedPayload');

    if (!item) break;
    claimed.push(item);
  }

  if (claimed.length !== quantity) {
    // Rollback any partial claims
    await InventoryItem.updateMany(
      { _id: { $in: claimed.map((i) => i._id) }, reservedForOrder: order._id },
      { $set: { status: 'available', assignedToUser: null, reservedForOrder: null, assignedAt: null } },
    );
    return [];
  }

  return claimed.map((item) => ({
    inventoryItemId: item._id,
    productId: item.product,
    variantId: item.variantId || null,
    itemType: item.itemType,
    details: decryptJson(item.encryptedPayload),
    deliveredBy: actorId,
  }));
};

/**
 * Process automated fulfillment for an eligible order (when payment is verified).
 */
export const autoFulfillEligibleItems = async (order, actorId) => {
  if (!order.deliveries) order.deliveries = [];
  let fulfilledCount = 0;

  for (const item of order.items) {
    if (order.deliveries.some((d) => String(d.orderItemId) === String(item._id))) continue;

    const isBundle = (item.itemType || 'product') === 'bundle';
    if (isBundle) continue; // Bundles are handled via component deliveries or admin delivery modal

    const product = await Product.findById(item.productId).lean();
    if (!product) continue;

    const fulfillmentType = item.fulfillmentType || product.fulfillmentType || (product.deliveryType === 'instant' ? 'license_key' : 'manual');
    const autoDeliver = product.fulfillmentConfig?.autoDeliverKey || product.deliveryType === 'instant';

    // 1. License Key auto-delivery from vault
    if (fulfillmentType === 'license_key' && autoDeliver) {
      const claims = await claimInventoryVaultItems({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        itemType: 'license_key',
        order,
        actorId,
      });

      if (claims.length === item.quantity) {
        const payload = claims.length === 1
          ? claims[0].details
          : { licenseKeys: claims.map((c) => c.details?.licenseKey || c.details) };

        order.deliveries.push({
          orderItemId: item._id,
          summary: `Instant License Key Delivery (${item.productName})`,
          encryptedPayload: encryptJson(payload),
          deliveredBy: actorId,
          deliveredAt: new Date(),
        });
        order.timeline.push({ event: 'License Key Assigned from Vault', status: 'processing', actor: actorId });
        fulfilledCount += 1;
        continue;
      }
    }

    // 2. Account Credentials auto-delivery from vault
    if (fulfillmentType === 'account_credentials' && autoDeliver) {
      const claims = await claimInventoryVaultItems({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        itemType: 'account_credentials',
        order,
        actorId,
      });

      if (claims.length === item.quantity) {
        const payload = claims.length === 1
          ? claims[0].details
          : { accounts: claims.map((c) => c.details) };

        order.deliveries.push({
          orderItemId: item._id,
          summary: `Digital Account Credentials Delivery (${item.productName})`,
          encryptedPayload: encryptJson(payload),
          deliveredBy: actorId,
          deliveredAt: new Date(),
        });
        order.timeline.push({ event: 'Account Credentials Assigned from Vault', status: 'processing', actor: actorId });
        fulfilledCount += 1;
        continue;
      }
    }

    // 3. API Top-Up automated dispatch
    if (fulfillmentType === 'api_topup') {
      const providerName = product.fulfillmentConfig?.provider || 'default';
      const adapter = providerFactory.get(providerName);
      if (adapter) {
        try {
          const result = await adapter.processTopUp({
            order,
            item,
            accountInfo: item.customerInputs || {},
            config: product.fulfillmentConfig,
          });

          if (result && result.success) {
            order.deliveries.push({
              orderItemId: item._id,
              summary: `Automated In-Game Top-Up (${product.name})`,
              encryptedPayload: encryptJson({
                status: 'completed',
                provider: providerName,
                referenceId: result.referenceId,
                message: result.message,
                account: item.customerInputs || {},
                completedAt: new Date().toISOString(),
              }),
              deliveredBy: actorId,
              deliveredAt: new Date(),
            });
            order.timeline.push({
              event: `API Top-Up Completed via ${providerName} (${result.referenceId})`,
              status: 'processing',
              actor: actorId,
            });
            fulfilledCount += 1;
            continue;
          }
        } catch {
          // If API provider fails, order remains in verified/processing for manual fulfillment
        }
      }
    }

    // 4. Fallback legacy instant delivery
    if (product.deliveryType === 'instant') {
      const claims = await claimInventoryVaultItems({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        order,
        actorId,
      });

      if (claims.length === item.quantity) {
        const payload = claims.length === 1 ? claims[0].details : { units: claims.map((c) => c.details) };
        order.deliveries.push({
          orderItemId: item._id,
          summary: 'Instant digital delivery',
          encryptedPayload: encryptJson(payload),
          deliveredBy: actorId,
          deliveredAt: new Date(),
        });
        order.timeline.push({ event: 'Instant delivery assigned', status: 'processing', actor: actorId });
        fulfilledCount += 1;
      }
    }
  }

  return fulfilledCount > 0;
};
