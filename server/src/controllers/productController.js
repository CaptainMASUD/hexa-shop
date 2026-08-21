import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import StockMovement from '../models/StockMovement.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { toSlug } from '../utils/slug.js';
import { destroyImage } from '../services/cloudinaryService.js';
import { writeAudit } from '../services/auditService.js';

const buildProductQuery = async (query, adminMode = false) => {
  const filter = adminMode ? {} : { status: 'active' };
  if (query.q) filter.$text = { $search: query.q };
  if (query.category) {
    const category = mongoose.isValidObjectId(query.category)
      ? await Category.findById(query.category).select('_id').lean()
      : await Category.findOne({ slug: query.category }).select('_id').lean();
    filter.category = category?._id || new mongoose.Types.ObjectId();
  }
  if (query.type) filter.productType = query.type;
  if (query.featured) filter.featured = query.featured === 'true';
  if (query.popular) filter.popular = query.popular === 'true';
  if (query.availability === 'in_stock') filter.$or = [{ stock: { $gt: 0 } }, { variants: { $elemMatch: { stock: { $gt: 0 }, active: true } } }];
  if (query.availability === 'out_of_stock') filter.$and = [{ stock: { $lte: 0 } }, { variants: { $not: { $elemMatch: { stock: { $gt: 0 }, active: true } } } }];
  return filter;
};

const sortMap = {
  newest: { createdAt: -1 },
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
  const stock = product.variants?.length
    ? product.variants.reduce((sum, variant) => sum + (variant.active ? Number(variant.stock || 0) : 0), 0)
    : Number(product.stock || 0);
  product.stockStatus = stock <= 0 ? 'out_of_stock' : stock <= Number(product.lowStockThreshold || 0) ? 'low_stock' : 'in_stock';
  return product;
};

const list = (adminMode = false) => asyncHandler(async (req, res) => {
  const { page, limit, sort, minPrice, maxPrice } = req.query;
  const filter = await buildProductQuery(req.query, adminMode);
  const needsComputedPrice = minPrice !== undefined || maxPrice !== undefined || sort === 'price_asc' || sort === 'price_desc';

  if (needsComputedPrice) {
    const priceMatch = {};
    if (minPrice !== undefined) priceMatch.$gte = Number(minPrice);
    if (maxPrice !== undefined) priceMatch.$lte = Number(maxPrice);
    const pipeline = [
      { $match: filter },
      { $addFields: { _effectivePrice: effectivePriceExpression } },
      ...(Object.keys(priceMatch).length ? [{ $match: { _effectivePrice: priceMatch } }] : []),
      { $sort: sort === 'price_asc' ? { _effectivePrice: 1, createdAt: -1 } : sort === 'price_desc' ? { _effectivePrice: -1, createdAt: -1 } : (sortMap[sort] || sortMap.newest) },
      { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], meta: [{ $count: 'total' }] } },
    ];
    const [result] = await Product.aggregate(pipeline);
    const data = result?.data || [];
    await Product.populate(data, { path: 'category', select: 'name slug image' });
    data.forEach((product) => { delete product._effectivePrice; addStockStatus(product); });
    const total = result?.meta?.[0]?.total || 0;
    return success(res, { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  }

  const [data, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug image')
      .sort(sortMap[sort] || sortMap.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);
  return success(res, { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
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
  if (product.stock > 0) initialMovements.push({ product: product._id, previousStock: 0, quantityChanged: product.stock, newStock: product.stock, reason: 'Initial product stock', changedBy: req.user._id });
  for (const variant of product.variants) {
    if (variant.stock > 0) initialMovements.push({ product: product._id, variantId: variant._id, previousStock: 0, quantityChanged: variant.stock, newStock: variant.stock, reason: 'Initial plan stock', changedBy: req.user._id });
  }
  if (initialMovements.length) await StockMovement.insertMany(initialMovements);
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
  if (product.stock !== previousBaseStock) movements.push({ product: product._id, previousStock: previousBaseStock, quantityChanged: product.stock - previousBaseStock, newStock: product.stock, reason: 'Product stock changed from product editor', changedBy: req.user._id });
  for (const variant of product.variants) {
    const previous = previousVariantStocks.get(String(variant._id)) ?? 0;
    if (variant.stock !== previous) movements.push({ product: product._id, variantId: variant._id, previousStock: previous, quantityChanged: variant.stock - previous, newStock: variant.stock, reason: previousVariantStocks.has(String(variant._id)) ? 'Plan stock changed from product editor' : 'Plan created with initial stock', changedBy: req.user._id });
  }
  if (movements.length) await StockMovement.insertMany(movements);
  const nextImages = new Set([product.thumbnail?.publicId, ...(product.galleryImages || []).map((i) => i.publicId), product.bannerImage?.publicId].filter(Boolean));
  await Promise.all(oldImages.filter((id) => !nextImages.has(id)).map(destroyImage));
  await writeAudit(req, 'product_updated', 'Product', product._id, { name: product.name, stockMovements: movements.length });
  return success(res, { message: 'Product updated successfully', data: product });
});

export const archiveProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  product.status = 'archived';
  await product.save();
  await writeAudit(req, 'product_archived', 'Product', product._id, { name: product.name });
  return success(res, { message: 'Product archived successfully' });
});
