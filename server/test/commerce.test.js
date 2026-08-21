import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCouponDiscount, calculatePromotionDiscount, commerceItemKey } from '../src/utils/commerce.js';

test('fixed promotion is applied once across multiple targeted product lines', () => {
  const promotion = { _id: 'promo', name: 'Campaign', discountType: 'fixed', discountValue: 100, products: ['p1', 'p2'], categories: [], bundles: [], scope: 'targeted' };
  const result = calculatePromotionDiscount([promotion], [
    { itemType: 'product', productId: 'p1', categoryId: 'c1', lineTotal: 500 },
    { itemType: 'product', productId: 'p2', categoryId: 'c1', lineTotal: 700 },
  ]);
  assert.equal(result.discount, 100);
});

test('coupon discounts only eligible product subtotal', () => {
  const coupon = { type: 'percent', value: 10, maxDiscount: 0, allowedProducts: ['p1'], allowedCategories: [], allowedBundles: [] };
  const result = calculateCouponDiscount(coupon, [
    { itemType: 'product', productId: 'p1', categoryId: 'c1', lineTotal: 500 },
    { itemType: 'product', productId: 'p2', categoryId: 'c1', lineTotal: 5000 },
  ]);
  assert.equal(result.eligibleSubtotal, 500);
  assert.equal(result.discount, 50);
});

test('bundle promotions target bundle lines without discounting component product lines', () => {
  const promotion = { _id: 'promo', name: 'Bundle offer', discountType: 'percent', discountValue: 20, products: [], categories: [], bundles: ['b1'], scope: 'targeted' };
  const result = calculatePromotionDiscount([promotion], [
    { itemType: 'bundle', bundleId: 'b1', lineTotal: 1000 },
    { itemType: 'product', productId: 'p1', categoryId: 'c1', lineTotal: 500 },
  ]);
  assert.equal(result.discount, 200);
});

test('cart item key keeps products, variants, and bundles separate', () => {
  assert.equal(commerceItemKey({ itemType: 'product', productId: 'p1', variantId: 'v1' }), 'product:p1:v1');
  assert.equal(commerceItemKey({ itemType: 'bundle', bundleId: 'b1' }), 'bundle:b1');
});
