import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import ProductInteraction from '../models/ProductInteraction.js';
import RestockAlert from '../models/RestockAlert.js';
import StockMovement from '../models/StockMovement.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { toSlug } from '../utils/slug.js';
import { destroyImage } from '../services/cloudinaryService.js';
import { writeAudit } from '../services/auditService.js';
import { subscribeRestockAlert, checkAndTriggerRestockAlerts } from '../services/restockService.js';
import { paginateWithCursor } from '../utils/cursorPagination.js';
import serverCache from '../utils/cache.js';

export const PRODUCT_CARD_FIELDS = 'name slug brand thumbnail bannerImage regularPrice salePrice currency productType featured popular newArrival sortOrder ratingAverage reviewCount shortDescription stock allowUnlimitedStock lowStockThreshold variants._id variants.name variants.regularPrice variants.salePrice variants.stock variants.active variants.unlimitedStock variants.duration variants.region variants.platform customFields.name customFields.required customFields.type category soldQuantity createdAt';

const buildProductQuery = async (query, adminMode = false) => {
  const filter = adminMode ? {} : { status: 'active' };
  if (adminMode && query.status && query.status !== 'all') {
    filter.status = query.status;
  }
  if (query.q) filter.$text = { $search: query.q };
  if (query.category) {
    const category = mongoose.isValidObjectId(query.category)
      ? await Category.findById(query.category).select('_id').lean()
      : await Category.findOne({ slug: query.category }).select('_id').lean();
    filter.category = category?._id || new mongoose.Types.ObjectId();
  }
  const type = query.productType || query.type;
  if (type) filter.productType = type;
  if (query.brand) filter.brand = { $regex: new RegExp(query.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  if (query.region) filter['variants.region'] = { $regex: new RegExp(query.region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  if (query.platform) filter['variants.platform'] = { $regex: new RegExp(query.platform.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  if (query.featured) filter.featured = query.featured === 'true';
  if (query.popular) filter.popular = query.popular === 'true';
  if (query.availability === 'in_stock') {
    filter.$or = [
      { allowUnlimitedStock: true },
      { stock: { $gt: 0 } },
      { variants: { $elemMatch: { $or: [{ unlimitedStock: true }, { stock: { $gt: 0 } }], active: true } } },
    ];
  }
  if (query.availability === 'out_of_stock') {
    filter.$and = [
      { allowUnlimitedStock: { $ne: true } },
      { stock: { $lte: 0 } },
      { variants: { $not: { $elemMatch: { $or: [{ unlimitedStock: true }, { stock: { $gt: 0 } }], active: true } } } },
    ];
  }
  return filter;
};

const sortMap = {
  newest: { createdAt: -1 },
  order: { sortOrder: 1, createdAt: -1 },
  popular: { soldQuantity: -1, createdAt: -1 },
  price_asc: { salePrice: 1, regularPrice: 1 },
  price_desc: { salePrice: -1, regularPrice: -1 },
  discount: { salePrice: 1, regularPrice: -1 },
};

const effectivePriceExpression = {
  $let: {
    vars: {
      activeVariants: {
        $filter: { input: { $ifNull: ['$variants', []] }, as: 'variant', cond: { $eq: ['$$variant.active', true] } },
      },
    },
    in: {
      $cond: [
        { $gt: [{ $size: '$$activeVariants' }, 0] },
        {
          $min: {
            $map: {
              input: '$$activeVariants', as: 'variant',
              in: {
                $cond: [
                  { $and: [{ $gt: ['$$variant.salePrice', 0] }, { $lt: ['$$variant.salePrice', '$$variant.regularPrice'] }] },
                  '$$variant.salePrice', '$$variant.regularPrice',
                ],
              },
            },
          },
        },
        {
          $cond: [
            { $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$regularPrice'] }] },
            '$salePrice', '$regularPrice',
          ],
        },
      ],
    },
  },
};

const addStockStatus = (product) => {
  if (product.allowUnlimitedStock) {
    product.stockStatus = 'in_stock';
    return product;
  }
  if (product.variants?.length) {
    const hasUnlimited = product.variants.some((v) => v.active && v.unlimitedStock);
    if (hasUnlimited) {
      product.stockStatus = 'in_stock';
      return product;
    }
  }
  const stock = product.variants?.length
    ? product.variants.reduce((sum, variant) => sum + (variant.active ? Number(variant.stock || 0) : 0), 0)
    : Number(product.stock || 0);
  product.stockStatus = stock <= 0 ? 'out_of_stock' : stock <= Number(product.lowStockThreshold || 0) ? 'low_stock' : 'in_stock';
  return product;
};

const list = (adminMode = false) => asyncHandler(async (req, res) => {
  const { page, limit: limitParam, sort, minPrice, maxPrice, cursor, direction } = req.query;
  const filter = await buildProductQuery(req.query, adminMode);
  const limit = Math.min(100, Math.max(1, Number(limitParam || 20)));
  const needsComputedPrice = minPrice !== undefined || maxPrice !== undefined || sort === 'price_asc' || sort === 'price_desc';

  if (needsComputedPrice) {
    const priceMatch = {};
    if (minPrice !== undefined) priceMatch.$gte = Number(minPrice);
    if (maxPrice !== undefined) priceMatch.$lte = Number(maxPrice);
    const currentPage = Math.max(1, Number(page || 1));
    const pipeline = [
      { $match: filter },
      { $addFields: { _effectivePrice: effectivePriceExpression } },
      ...(Object.keys(priceMatch).length ? [{ $match: { _effectivePrice: priceMatch } }] : []),
      { $sort: sort === 'price_asc' ? { _effectivePrice: 1, createdAt: -1 } : sort === 'price_desc' ? { _effectivePrice: -1, createdAt: -1 } : (sortMap[sort] || sortMap.newest) },
      ...(!adminMode ? [{ $project: { description: 0, faqs: 0, guide: 0, details: 0, fulfillmentConfig: 0, seo: 0, searchKeywords: 0 } }] : []),
      { $facet: { data: [{ $skip: (currentPage - 1) * limit }, { $limit: limit }], meta: [{ $count: 'total' }] } },
    ];
    const [result] = await Product.aggregate(pipeline);
    const data = result?.data || [];
    await Product.populate(data, { path: 'category', select: 'name slug image' });
    data.forEach((product) => { delete product._effectivePrice; addStockStatus(product); });
    const total = result?.meta?.[0]?.total || 0;
    return success(res, { data, meta: { page: currentPage, limit, total, pages: Math.ceil(total / limit) } });
  }

  if (!adminMode && !cursor && !page) {
    const data = await Product.find(filter)
      .select(PRODUCT_CARD_FIELDS)
      .populate('category', 'name slug image')
      .sort(sortMap[sort] || sortMap.newest)
      .limit(limit)
      .lean({ virtuals: true });
    data.forEach(addStockStatus);
    return success(res, { data, meta: { limit, count: data.length } });
  }

  if (cursor || adminMode || !page) {
    const result = await paginateWithCursor(Product, filter, {
      limit,
      cursor,
      direction,
      select: adminMode ? undefined : PRODUCT_CARD_FIELDS,
      populate: { path: 'category', select: 'name slug image' },
      virtuals: true,
      includeTotal: adminMode || Boolean(req.query.includeTotal),
    });
    result.data.forEach(addStockStatus);
    return success(res, result);
  }

  const currentPage = Math.max(1, Number(page || 1));
  const [data, total] = await Promise.all([
    Product.find(filter)
      .select(adminMode ? undefined : PRODUCT_CARD_FIELDS)
      .populate('category', 'name slug image')
      .sort(sortMap[sort] || sortMap.newest)
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);
  data.forEach(addStockStatus);
  return success(res, { data, meta: { page: currentPage, limit, total, pages: Math.ceil(total / limit) } });
});

export const listProducts = list(false);
export const listAdminProducts = list(true);

export const suggestions = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return success(res, { data: [] });
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const data = await Product.find({ status: 'active', name: { $regex: `^${escaped}`, $options: 'i' } })
    .select('name slug thumbnail regularPrice salePrice productType')
    .limit(8)
    .lean();
  return success(res, { data });
});

export const getProduct = asyncHandler(async (req, res) => {
  const filter = mongoose.isValidObjectId(req.params.slugOrId)
    ? { _id: req.params.slugOrId, status: 'active' }
    : { slug: req.params.slugOrId, status: 'active' };
  const product = await Product.findOne(filter).populate('category', 'name slug image').lean({ virtuals: true });
  if (!product) throw new ApiError(404, 'Product not found');
  delete product.purchasePrice;
  delete product.costPrice;
  if (product.variants?.length) {
    product.variants.forEach((v) => {
      delete v.purchasePrice;
      delete v.costPrice;
    });
  }
  return success(res, { data: product });
});

export const getAdminProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug').lean({ virtuals: true });
  if (!product) throw new ApiError(404, 'Product not found');
  return success(res, { data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.body.category, status: { $ne: 'archived' } });
  if (!category) throw new ApiError(400, 'Category is unavailable');
  const product = await Product.create({ ...req.body, slug: toSlug(req.body.slug || req.body.name) });
  const initialMovements = [];
  if (product.stock > 0) initialMovements.push({ product: product._id, previousStock: 0, quantityChanged: product.stock, newStock: product.stock, purchasePrice: product.purchasePrice || 0, reason: 'Initial product stock', changedBy: req.user._id });
  for (const variant of product.variants) {
    if (variant.stock > 0) initialMovements.push({ product: product._id, variantId: variant._id, previousStock: 0, quantityChanged: variant.stock, newStock: variant.stock, purchasePrice: variant.purchasePrice || variant.costPrice || 0, reason: 'Initial plan stock', changedBy: req.user._id });
  }
  if (initialMovements.length) await StockMovement.insertMany(initialMovements);
  serverCache.invalidateTags(['products', 'home']);
  await writeAudit(req, 'product_created', 'Product', product._id, { name: product.name });
  return success(res, { status: 201, message: 'Product created successfully', data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  const oldImages = [product.thumbnail?.publicId, ...(product.galleryImages || []).map((i) => i.publicId), product.bannerImage?.publicId].filter(Boolean);
  const previousBaseStock = product.stock;
  const previousVariantStocks = new Map(product.variants.map((variant) => [String(variant._id), variant.stock]));
  Object.assign(product, { ...req.body, slug: toSlug(req.body.slug || req.body.name) });
  await product.save();
  const movements = [];
  if (product.stock !== previousBaseStock) movements.push({ product: product._id, previousStock: previousBaseStock, quantityChanged: product.stock - previousBaseStock, newStock: product.stock, purchasePrice: product.purchasePrice || 0, reason: 'Product stock changed from product editor', changedBy: req.user._id });
  for (const variant of product.variants) {
    const previous = previousVariantStocks.get(String(variant._id)) ?? 0;
    if (variant.stock !== previous) {
      movements.push({ product: product._id, variantId: variant._id, previousStock: previous, quantityChanged: variant.stock - previous, newStock: variant.stock, purchasePrice: variant.purchasePrice || variant.costPrice || 0, reason: previousVariantStocks.has(String(variant._id)) ? 'Plan stock changed from product editor' : 'Plan created with initial stock', changedBy: req.user._id });
      if (variant.stock > previous) {
        checkAndTriggerRestockAlerts(product._id, variant._id).catch(() => {});
      }
    }
  }
  if (product.stock > previousBaseStock) {
    checkAndTriggerRestockAlerts(product._id).catch(() => {});
  }
  if (movements.length) await StockMovement.insertMany(movements);
  const nextImages = new Set([product.thumbnail?.publicId, ...(product.galleryImages || []).map((i) => i.publicId), product.bannerImage?.publicId].filter(Boolean));
  await Promise.all(oldImages.filter((id) => !nextImages.has(id)).map(destroyImage));
  serverCache.invalidateTags(['products', 'home']);
  await writeAudit(req, 'product_updated', 'Product', product._id, { name: product.name, stockMovements: movements.length });
  return success(res, { message: 'Product updated successfully', data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const isPermanent = req.query.permanent === 'true' || req.query.force === 'true';
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  if (isPermanent) {
    const pendingOrders = await Order.countDocuments({
      'items.productId': product._id,
      status: { $in: ['pending', 'processing'] },
    });
    if (pendingOrders > 0) {
      throw new ApiError(
        400,
        `Cannot permanently delete "${product.name}" because it is associated with ${pendingOrders} pending/processing order(s). Please fulfill or cancel these orders first, or archive the product instead.`
      );
    }

    const imagesToClean = [
      product.thumbnail?.publicId,
      ...(product.galleryImages || []).map((img) => img?.publicId),
      product.bannerImage?.publicId,
    ].filter(Boolean);

    await Promise.allSettled(imagesToClean.map(destroyImage));

    await Promise.allSettled([
      ProductInteraction.deleteMany({ product: product._id }),
      RestockAlert.deleteMany({ product: product._id }),
      StockMovement.deleteMany({ product: product._id }),
    ]);

    await Product.deleteOne({ _id: product._id });
    serverCache.invalidateTags(['products', 'home']);
    await writeAudit(req, 'product_deleted', 'Product', product._id, { name: product.name, permanent: true });
    return success(res, { message: 'Product permanently deleted successfully' });
  }

  product.status = 'archived';
  await product.save();
  serverCache.invalidateTags(['products', 'home']);
  await writeAudit(req, 'product_archived', 'Product', product._id, { name: product.name });
  return success(res, { message: 'Product archived successfully' });
});

export const archiveProduct = deleteProduct;

export const createRestockAlert = asyncHandler(async (req, res) => {
  const { email, variantId } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const alert = await subscribeRestockAlert({
    productId: product._id,
    variantId: variantId || null,
    email,
    userId: req.user?._id || null,
  });

  return success(res, {
    status: 201,
    message: 'We will notify you immediately once this item is back in stock!',
    data: alert,
  });
});
