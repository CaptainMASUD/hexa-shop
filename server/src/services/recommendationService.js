import Product from '../models/Product.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Subscription from '../models/Subscription.js';
import ProductInteraction from '../models/ProductInteraction.js';
import Category from '../models/Category.js';

/**
 * Deterministic recommendation and product search scoring engine based on real user behavior & active product catalog.
 */
export async function getRecommendationsForUser(userId = null, options = {}) {
  const limit = Math.min(12, Math.max(1, Number(options.limit || 5)));
  const excludeIds = new Set(
    (options.excludeProductIds || []).map((id) => String(id))
  );

  const searchRaw = String(options.search || options.query || '').trim();
  const searchKeywords = searchRaw
    .replace(/[^\w\s-]/gi, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 2 && !['want', 'need', 'purchase', 'buy', 'show', 'tell', 'about', 'what', 'with', 'have', 'from', 'this', 'that'].includes(k));

  // If unauthenticated guest visitor
  if (!userId) {
    return getAnonymousRecommendations(options, limit, excludeIds, searchKeywords);
  }

  // Fetch customer signals in parallel
  const [user, interactions, recentOrders, subscriptions] = await Promise.all([
    User.findById(userId).select('wishlist recentlyViewed').lean(),
    ProductInteraction.find({ user: userId }).lean(),
    Order.find({
      user: userId,
      status: { $in: ['confirmed', 'processing', 'delivered'] },
    })
      .select('items.productId items.productName items.category createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Subscription.find({ user: userId })
      .select('productName plan status expiresAt autoRenew')
      .sort({ expiresAt: -1 })
      .limit(15)
      .lean(),
  ]);

  // 1. Map Wishlist IDs
  const wishlistSet = new Set((user?.wishlist || []).map((id) => String(id)));

  // 2. Map Cart IDs from client or interaction records
  const cartSet = new Set([
    ...(options.cartProductIds || []).map((id) => String(id)),
    ...interactions.filter((i) => i.inCart).map((i) => String(i.product)),
  ]);

  // 3. Map View Counts & Recency
  const viewCountMap = new Map();
  const recentViewsSet = new Set();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  for (const item of interactions) {
    const pId = String(item.product);
    viewCountMap.set(pId, Math.max(viewCountMap.get(pId) || 0, item.viewCount || 1));
    if (item.lastViewedAt && new Date(item.lastViewedAt) > fourteenDaysAgo) {
      recentViewsSet.add(pId);
    }
  }

  for (const item of user?.recentlyViewed || []) {
    if (item?.product) {
      const pId = String(item.product);
      viewCountMap.set(pId, Math.max(viewCountMap.get(pId) || 0, 1));
      recentViewsSet.add(pId);
    }
  }

  // 4. Map Subscriptions (Active vs Near Expiry vs Expired)
  const now = new Date();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const activeSubscriptionNames = new Set();
  const renewalSubscriptionMap = new Map();

  for (const sub of subscriptions || []) {
    if (!sub.productName) continue;
    const nameLower = sub.productName.trim().toLowerCase();

    if (sub.status === 'active' && sub.expiresAt && new Date(sub.expiresAt) > sevenDaysFromNow) {
      activeSubscriptionNames.add(nameLower);
    } else if (
      sub.status === 'expired' ||
      (sub.expiresAt && new Date(sub.expiresAt) <= sevenDaysFromNow)
    ) {
      const daysLeft = sub.expiresAt
        ? Math.ceil((new Date(sub.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      renewalSubscriptionMap.set(nameLower, daysLeft);
    }
  }

  // 5. Map Preferred Categories
  const preferredCategoryIds = new Set();
  const interactedProductIds = [
    ...wishlistSet,
    ...cartSet,
    ...viewCountMap.keys(),
  ];

  if (interactedProductIds.length > 0) {
    const interactedDocs = await Product.find({
      _id: { $in: interactedProductIds },
    }).select('category').lean();

    for (const doc of interactedDocs) {
      if (doc.category) preferredCategoryIds.add(String(doc.category));
    }
  }

  // 6. Query Candidate Active Products
  const query = { status: 'active' };
  if (options.category) {
    const catDoc = await Category.findOne({
      $or: [{ slug: options.category }, { _id: options.category }],
    }).select('_id').lean();
    if (catDoc) query.category = catDoc._id;
  }

  const candidateProducts = await Product.find(query)
    .populate('category', 'name slug')
    .lean({ virtuals: true });

  // 7. Score & Rank Each Product
  const scoredProducts = [];

  for (const product of candidateProducts) {
    const pId = String(product._id);
    if (excludeIds.has(pId)) continue;

    // Stock verification
    const isOutOfStock =
      !product.allowUnlimitedStock &&
      product.stock <= 0 &&
      (!product.variants?.length || !product.variants.some((v) => v.active && (v.unlimitedStock || v.stock > 0)));

    if (isOutOfStock) continue;

    let score = 0;
    let reason = 'Recommended based on your store interests';
    const prodNameLower = (product.name || '').trim().toLowerCase();
    const prodSlugLower = (product.slug || '').trim().toLowerCase();
    const prodBrandLower = (product.brand || '').trim().toLowerCase();
    const prodTags = (product.tags || []).map((t) => String(t).toLowerCase());

    // Search relevance match boost (+80 for direct match)
    if (searchKeywords.length > 0) {
      let searchMatched = false;
      for (const kw of searchKeywords) {
        if (prodNameLower.includes(kw) || prodSlugLower.includes(kw) || prodBrandLower.includes(kw)) {
          score += 80;
          searchMatched = true;
          reason = `Matched "${kw}" from store catalog`;
        } else if (prodTags.some((t) => t.includes(kw))) {
          score += 40;
          searchMatched = true;
          reason = `Related to "${kw}"`;
        }
      }
      if (!searchMatched && searchKeywords.length > 0) {
        // deprioritize unrelated products if a specific keyword was searched
        score -= 20;
      }
    }

    // Renewal candidate (+45)
    if (renewalSubscriptionMap.has(prodNameLower)) {
      const daysLeft = renewalSubscriptionMap.get(prodNameLower);
      score += 45;
      reason = daysLeft <= 0
        ? 'Your previous subscription has expired — renew anytime'
        : `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — easy renewal`;
    }
    // Existing active subscription penalty
    else if (activeSubscriptionNames.has(prodNameLower) && product.productType === 'subscription') {
      score -= 50;
    }

    // Wishlist Signal (+25)
    if (wishlistSet.has(pId)) {
      score += 25;
      if (score < 60) reason = 'Saved in your wishlist — ready for checkout';
    }

    // Cart Signal (+20)
    if (cartSet.has(pId)) {
      score += 20;
      if (score < 60) reason = 'In your current shopping selection';
    }

    // Repeated Views Signal (+15 to +25)
    const views = viewCountMap.get(pId) || 0;
    if (views >= 4) {
      score += 25;
      if (score < 60) reason = 'You have shown frequent interest in this product';
    } else if (views >= 2) {
      score += 15;
      if (score < 60) reason = 'Based on your recent viewing history';
    } else if (recentViewsSet.has(pId)) {
      score += 10;
      if (score < 60) reason = 'Recently viewed by you';
    }

    // Category Affinity (+18)
    const catId = String(product.category?._id || product.category);
    if (preferredCategoryIds.has(catId)) {
      score += 18;
      if (score < 30) {
        reason = `Popular in ${product.category?.name || 'this category'}`;
      }
    }

    // Base Popularity & Rating Boost
    if (product.popular) score += 6;
    if (product.featured) score += 4;
    if (product.ratingAverage >= 4.5) score += 3;

    scoredProducts.push({
      product,
      score,
      reason,
    });
  }

  // Sort by score descending, then rating average, then sales volume
  scoredProducts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.product.ratingAverage || 0) !== (a.product.ratingAverage || 0)) {
      return (b.product.ratingAverage || 0) - (a.product.ratingAverage || 0);
    }
    return (b.product.soldQuantity || 0) - (a.product.soldQuantity || 0);
  });

  return scoredProducts.slice(0, limit).map(({ product, reason }) => formatProductRecommendation(product, reason));
}

/**
 * Fallback recommendations for anonymous / guest visitors with keyword search awareness.
 */
async function getAnonymousRecommendations(options = {}, limit = 5, excludeIds = new Set(), searchKeywords = []) {
  const query = { status: 'active' };

  if (options.category) {
    const catDoc = await Category.findOne({
      $or: [{ slug: options.category }, { _id: options.category }],
    }).select('_id').lean();
    if (catDoc) query.category = catDoc._id;
  }

  const guestViews = options.guestViewProductIds || [];
  let preferredCatIds = [];
  if (guestViews.length > 0) {
    preferredCatIds = await Product.distinct('category', {
      _id: { $in: guestViews },
    });
  }

  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort({ popular: -1, ratingAverage: -1, soldQuantity: -1, createdAt: -1 })
    .limit(limit * 3)
    .lean({ virtuals: true });

  const scored = [];

  for (const p of products) {
    const pId = String(p._id);
    if (excludeIds.has(pId)) continue;
    const isOutOfStock =
      !p.allowUnlimitedStock &&
      p.stock <= 0 &&
      (!p.variants?.length || !p.variants.some((v) => v.active && (v.unlimitedStock || v.stock > 0)));
    if (isOutOfStock) continue;

    let score = 0;
    let reason = 'Top rated digital product on HEXA';
    const prodNameLower = (p.name || '').trim().toLowerCase();
    const prodSlugLower = (p.slug || '').trim().toLowerCase();
    const prodBrandLower = (p.brand || '').trim().toLowerCase();
    const prodTags = (p.tags || []).map((t) => String(t).toLowerCase());

    if (searchKeywords.length > 0) {
      let matched = false;
      for (const kw of searchKeywords) {
        if (prodNameLower.includes(kw) || prodSlugLower.includes(kw) || prodBrandLower.includes(kw)) {
          score += 80;
          matched = true;
          reason = `Available plan on HEXA`;
        } else if (prodTags.some((t) => t.includes(kw))) {
          score += 40;
          matched = true;
          reason = `Related product`;
        }
      }
      if (!matched) score -= 10;
    }

    if (p.popular) {
      score += 10;
      if (score < 40) reason = 'Bestseller in store';
    } else if (p.featured) {
      score += 6;
      if (score < 40) reason = 'Featured selection';
    } else if (preferredCatIds.some((cid) => String(cid) === String(p.category?._id || p.category))) {
      score += 15;
      reason = `Trending in ${p.category?.name || 'this category'}`;
    }

    scored.push({ product: p, score, reason });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ product, reason }) => formatProductRecommendation(product, reason));
}

/**
 * Format Product document into clean, standardized recommendation response with plans.
 */
function formatProductRecommendation(product, reason) {
  const regularPrice = Number(product.regularPrice || 0);
  const salePrice = Number(product.salePrice || 0);
  const effectivePrice = salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice;

  // Derive duration/plan options from active variants
  const availablePlans = (product.variants || [])
    .filter((v) => v.active && (v.unlimitedStock || v.stock > 0))
    .map((v) => {
      const price = v.salePrice > 0 && v.salePrice < v.regularPrice ? v.salePrice : v.regularPrice;
      return {
        id: String(v._id),
        name: v.name,
        duration: v.duration || '',
        price,
        regularPrice: v.regularPrice,
        salePrice: v.salePrice > 0 ? v.salePrice : null,
      };
    });

  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    image: product.thumbnail?.url || product.galleryImages?.[0]?.url || '',
    category: product.category?.name || 'Digital Products',
    categorySlug: product.category?.slug || '',
    price: effectivePrice,
    regularPrice,
    salePrice: salePrice > 0 ? salePrice : null,
    productType: product.productType || 'digital-product',
    ratingAverage: Number(product.ratingAverage || 0),
    stockStatus: product.stockStatus || 'in_stock',
    availablePlans,
    url: `/product/${product.slug}`,
    reason,
  };
}
