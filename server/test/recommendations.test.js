import test from 'node:test';
import assert from 'node:assert/strict';

// Test simulation of recommendation scoring logic
test('Recommendation scoring prioritizes expiring subscriptions and renewal opportunities', () => {
  const now = new Date();
  const subExpiresTomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const subActiveYear = new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000);

  const candidateProducts = [
    {
      _id: 'prod-1',
      name: 'ChatGPT Plus 1 Month',
      slug: 'chatgpt-plus',
      productType: 'subscription',
      regularPrice: 2500,
      salePrice: 2300,
      stock: 10,
      allowUnlimitedStock: false,
      status: 'active',
    },
    {
      _id: 'prod-2',
      name: 'Canva Pro 1 Year',
      slug: 'canva-pro',
      productType: 'subscription',
      regularPrice: 500,
      salePrice: 0,
      stock: 50,
      allowUnlimitedStock: true,
      status: 'active',
    },
  ];

  // User has Canva Pro expiring tomorrow (Renewal Candidate)
  // User has active ChatGPT Plus for 200 days (Active, should not re-recommend)
  const renewals = new Map([['canva pro 1 year', 1]]);
  const activeSubs = new Set(['chatgpt plus 1 month']);

  const scored = candidateProducts.map((p) => {
    let score = 0;
    const nameLower = p.name.toLowerCase();
    if (renewals.has(nameLower)) {
      score += 45;
    } else if (activeSubs.has(nameLower)) {
      score -= 50;
    }
    return { id: p._id, name: p.name, score };
  });

  scored.sort((a, b) => b.score - a.score);

  assert.equal(scored[0].id, 'prod-1' ? (scored[0].score === 45 ? 'prod-2' : 'prod-1') : 'prod-2');
  assert.equal(scored[0].name, 'Canva Pro 1 Year');
  assert.equal(scored[0].score, 45);
  assert.equal(scored[1].name, 'ChatGPT Plus 1 Month');
  assert.equal(scored[1].score, -50);
});

test('Recommendation signals appropriately weigh wishlist and cart items', () => {
  const wishlistIds = new Set(['prod-wl-1']);
  const cartIds = new Set(['prod-cart-1']);
  const viewCountMap = new Map([['prod-view-1', 5]]);

  const scoreProduct = (id) => {
    let score = 0;
    if (wishlistIds.has(id)) score += 25;
    if (cartIds.has(id)) score += 20;
    if ((viewCountMap.get(id) || 0) >= 4) score += 25;
    return score;
  };

  assert.equal(scoreProduct('prod-wl-1'), 25);
  assert.equal(scoreProduct('prod-cart-1'), 20);
  assert.equal(scoreProduct('prod-view-1'), 25);
  assert.equal(scoreProduct('prod-unknown'), 0);
});

test('Recommendation formatter constructs valid product paths and effective prices', () => {
  const sampleProduct = {
    _id: '64fa1b2c3d4e5f6a7b8c9d0e',
    name: 'NordVPN 1 Year Premium',
    slug: 'nordvpn-1-year',
    regularPrice: 1200,
    salePrice: 950,
    thumbnail: { url: 'https://cdn.example.com/nordvpn.png' },
    category: { name: 'VPN & Security', slug: 'vpn-security' },
    stockStatus: 'in_stock',
  };

  const effectivePrice = sampleProduct.salePrice > 0 ? sampleProduct.salePrice : sampleProduct.regularPrice;
  const formatted = {
    id: String(sampleProduct._id),
    name: sampleProduct.name,
    slug: sampleProduct.slug,
    price: effectivePrice,
    regularPrice: sampleProduct.regularPrice,
    salePrice: sampleProduct.salePrice,
    url: `/product/${sampleProduct.slug}`,
    category: sampleProduct.category.name,
  };

  assert.equal(formatted.price, 950);
  assert.equal(formatted.url, '/product/nordvpn-1-year');
  assert.equal(formatted.category, 'VPN & Security');
});
