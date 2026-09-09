import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { toSlug } from '../utils/slug.js';
import { destroyImage } from '../services/cloudinaryService.js';
import { writeAudit } from '../services/auditService.js';
import { paginateWithCursor } from '../utils/cursorPagination.js';

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ status: 'active' }).sort({ displayOrder: 1, name: 1 }).lean();
  return success(res, { message: 'Categories retrieved successfully', data: categories });
});

export const listAdminCategories = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q && req.query.q.trim()) {
    const regex = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { slug: regex }];
  }
  if (req.query.status && req.query.status.trim()) {
    filter.status = req.query.status.trim();
  }

  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const result = await paginateWithCursor(Category, filter, {
    limit,
    cursor: req.query.cursor,
    direction: req.query.direction,
    includeTotal: true,
  });
  return success(res, result);
});

export const createCategory = asyncHandler(async (req, res) => {
  const payload = { ...req.body, slug: toSlug(req.body.slug || req.body.name) };
  const category = await Category.create(payload);
  await writeAudit(req, 'category_created', 'Category', category._id, { name: category.name });
  return success(res, { status: 201, message: 'Category created successfully', data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const existing = await Category.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Category not found');
  const oldPublicId = existing.image?.publicId;
  Object.assign(existing, { ...req.body, slug: toSlug(req.body.slug || req.body.name) });
  await existing.save();
  if (oldPublicId && oldPublicId !== existing.image?.publicId) await destroyImage(oldPublicId);
  await writeAudit(req, 'category_updated', 'Category', existing._id, { name: existing.name });
  return success(res, { message: 'Category updated successfully', data: existing });
});

export const archiveCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  const referenced = await Product.exists({ category: category._id });
  category.status = 'archived';
  await category.save();
  await writeAudit(req, 'category_archived', 'Category', category._id, { hadProducts: Boolean(referenced) });
  return success(res, { message: 'Category archived successfully' });
});
