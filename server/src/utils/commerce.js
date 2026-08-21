export const effectivePrice = (regular, sale) => {
  const regularPrice = Math.max(0, Number(regular || 0));
  const salePrice = Math.max(0, Number(sale || 0));
  return salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice;
};

export const commerceItemKey = ({ itemType = 'product', productId = null, bundleId = null, variantId = null }) => (
  itemType === 'bundle'
    ? `bundle:${String(bundleId || '')}`
    : `product:${String(productId || '')}:${String(variantId || '')}`
);

export const inventoryItemKey = ({ productId, variantId = null }) => `${String(productId)}:${String(variantId || '')}`;

export const isWindowActive = (resource, now = new Date()) => {
  if (!resource) return false;
  const startsAt = resource.startsAt ? new Date(resource.startsAt) : null;
  const endsAt = resource.endsAt ? new Date(resource.endsAt) : null;
  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
};

const promotionTargetsLine = (promotion, line) => {
  if (promotion.scope === 'all') return true;
  const products = new Set((promotion.products || []).map(String));
  const categories = new Set((promotion.categories || []).map(String));
  const bundles = new Set([...(promotion.bundles || []), ...(promotion.bundle ? [promotion.bundle] : [])].map(String));
  if (line.itemType === 'bundle') return bundles.has(String(line.bundleId || ''));
  return products.has(String(line.productId || '')) || categories.has(String(line.categoryId || ''));
};

/**
 * Promotions are intentionally non-stacking by default. The single campaign
 * producing the greatest discount for the current cart is applied. A fixed
 * campaign is applied once to the eligible subtotal, never once per line.
 */
export const calculatePromotionDiscount = (promotions = [], lines = []) => {
  let best = { discount: 0, promotion: null, eligibleSubtotal: 0 };
  for (const promotion of promotions) {
    if (!promotion || !['percent', 'fixed'].includes(promotion.discountType)) continue;
    const eligibleSubtotal = lines
      .filter((line) => promotionTargetsLine(promotion, line))
      .reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
    if (eligibleSubtotal <= 0) continue;
    const value = Math.max(0, Number(promotion.discountValue || 0));
    let discount = promotion.discountType === 'percent' ? eligibleSubtotal * (value / 100) : value;
    discount = Math.min(eligibleSubtotal, Math.max(0, discount));
    if (discount > best.discount) best = { discount, promotion, eligibleSubtotal };
  }
  return { ...best, discount: Number(best.discount.toFixed(2)) };
};

const couponTargetsLine = (coupon, line) => {
  const products = new Set((coupon.allowedProducts || []).map(String));
  const categories = new Set((coupon.allowedCategories || []).map(String));
  const bundles = new Set((coupon.allowedBundles || []).map(String));
  const restricted = products.size > 0 || categories.size > 0 || bundles.size > 0;
  if (!restricted) return true;
  if (line.itemType === 'bundle') return bundles.has(String(line.bundleId || ''));
  return products.has(String(line.productId || '')) || categories.has(String(line.categoryId || ''));
};

export const calculateCouponDiscount = (coupon, lines = []) => {
  const eligibleSubtotal = lines
    .filter((line) => couponTargetsLine(coupon, line))
    .reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
  if (eligibleSubtotal <= 0) return { eligibleSubtotal: 0, discount: 0 };
  const value = Math.max(0, Number(coupon.value || 0));
  let discount = coupon.type === 'percent' ? eligibleSubtotal * (value / 100) : value;
  if (Number(coupon.maxDiscount || 0) > 0) discount = Math.min(discount, Number(coupon.maxDiscount));
  discount = Math.min(eligibleSubtotal, Math.max(0, discount));
  return { eligibleSubtotal: Number(eligibleSubtotal.toFixed(2)), discount: Number(discount.toFixed(2)) };
};
