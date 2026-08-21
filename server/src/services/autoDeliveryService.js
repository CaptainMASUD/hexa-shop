import Product from '../models/Product.js';
import InventoryItem from '../models/InventoryItem.js';
import { decryptJson, encryptJson } from '../utils/encryption.js';

const claimCredentials = async ({ productId, variantId = null, quantity, order, actorId }) => {
  const candidates = await InventoryItem.find({ product: productId, variantId: variantId || null, status: 'available' }).select('_id').limit(quantity).lean();
  if (candidates.length < quantity) return [];
  const claimed = [];
  for (const candidate of candidates) {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: candidate._id, status: 'available' },
      { $set: { status: 'assigned', assignedToUser: order.user, reservedForOrder: order._id, assignedAt: new Date() } },
      { new: true },
    ).select('+encryptedPayload');
    if (!item) break;
    claimed.push(item);
  }
  if (claimed.length !== quantity) {
    await InventoryItem.updateMany({ _id: { $in: claimed.map((item) => item._id) }, reservedForOrder: order._id }, { $set: { status: 'available', assignedToUser: null, reservedForOrder: null, assignedAt: null } });
    return [];
  }
  return claimed.map((item) => ({
    inventoryItemId: item._id,
    productId: item.product,
    variantId: item.variantId || null,
    details: decryptJson(item.encryptedPayload),
    deliveredBy: actorId,
  }));
};

const rollbackClaims = async (claims, orderId) => {
  const ids = claims.flat().map((claim) => claim.inventoryItemId).filter(Boolean);
  if (!ids.length) return;
  await InventoryItem.updateMany({ _id: { $in: ids }, reservedForOrder: orderId }, { $set: { status: 'available', assignedToUser: null, reservedForOrder: null, assignedAt: null } });
};

export const autoDeliverEligibleItems = async (order, actorId) => {
  if (!order.deliveries) order.deliveries = [];
  let deliveredSomething = false;

  for (const item of order.items) {
    if (order.deliveries.some((delivery) => String(delivery.orderItemId) === String(item._id))) continue;
    const claims = [];

    if ((item.itemType || 'product') === 'bundle') {
      const componentProducts = await Product.find({ _id: { $in: (item.components || []).map((component) => component.productId) } }).select('_id deliveryType').lean();
      const deliveryTypeMap = new Map(componentProducts.map((product) => [String(product._id), product.deliveryType]));
      if ((item.components || []).some((component) => deliveryTypeMap.get(String(component.productId)) !== 'instant')) continue;

      let failed = false;
      for (const component of item.components || []) {
        const quantity = Number(component.quantityPerBundle || 1) * Number(item.quantity || 1);
        const componentClaims = await claimCredentials({ productId: component.productId, variantId: component.variantId || null, quantity, order, actorId });
        if (componentClaims.length !== quantity) { failed = true; break; }
        claims.push(componentClaims);
      }
      if (failed) { await rollbackClaims(claims, order._id); continue; }
    } else {
      const product = await Product.findById(item.productId).select('deliveryType');
      if (!product || product.deliveryType !== 'instant') continue;
      const itemClaims = await claimCredentials({ productId: item.productId, variantId: item.variantId || null, quantity: item.quantity, order, actorId });
      if (itemClaims.length !== item.quantity) continue;
      claims.push(itemClaims);
    }

    const flatClaims = claims.flat();
    const payload = flatClaims.length === 1 ? flatClaims[0].details : { units: flatClaims.map(({ productId, variantId, details }) => ({ productId, variantId, details })) };
    order.deliveries.push({ orderItemId: item._id, summary: 'Instant digital delivery', encryptedPayload: encryptJson(payload), deliveredBy: actorId });
    order.timeline.push({ event: 'Instant delivery assigned', status: 'processing', actor: actorId });
    deliveredSomething = true;
  }
  return deliveredSomething;
};
