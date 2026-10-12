import test from 'node:test';
import assert from 'node:assert/strict';
import Product from '../src/models/Product.js';
import StockMovement from '../src/models/StockMovement.js';

test('Product schema stores purchasePrice and synchronizes with costPrice', async () => {
  const p = new Product({
    name: 'Test Netflix Subscription',
    slug: 'test-netflix-subscription',
    category: '64d2f0a1b2c3d4e5f6a7b8c9',
    regularPrice: 300,
    salePrice: 250,
    purchasePrice: 180,
    variants: [
      {
        name: '1 Month Shared',
        regularPrice: 300,
        salePrice: 250,
        purchasePrice: 180,
      },
    ],
  });

  await p.validate();

  assert.equal(p.purchasePrice, 180);
  assert.equal(p.costPrice, 180);
  assert.equal(p.variants[0].purchasePrice, 180);
  assert.equal(p.variants[0].costPrice, 180);

  // Profit calculations
  const profit = p.salePrice - p.purchasePrice;
  const margin = Math.round((profit / p.salePrice) * 100);
  assert.equal(profit, 70);
  assert.equal(margin, 28);
});

test('StockMovement schema validates purchasePrice', async () => {
  const sm = new StockMovement({
    product: '64d2f0a1b2c3d4e5f6a7b8c9',
    previousStock: 10,
    quantityChanged: 50,
    newStock: 60,
    purchasePrice: 175,
    reason: 'Restock batch #42',
  });

  await sm.validate();
  assert.equal(sm.purchasePrice, 175);
  assert.equal(sm.quantityChanged, 50);
});
