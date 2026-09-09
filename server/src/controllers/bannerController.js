import Banner from '../models/Banner.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { destroyImage } from '../services/cloudinaryService.js';
import { writeAudit } from '../services/auditService.js';
import { paginateWithCursor } from '../utils/cursorPagination.js';

export const listBanners = asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = {
    active: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] },
    ],
  };

  if (req.query.placement) {
    const p = String(req.query.placement).trim().toLowerCase();
    if (p === 'offer' || p === 'offers') {
      filter.placement = { $in: ['offer', 'offers'] };
    } else if (p === 'hero' || p === 'home') {
      filter.placement = { $in: ['hero', 'home'] };
    } else {
      filter.placement = p;
    }
  }

  const data = await Banner.find(filter).sort({ displayOrder: 1, createdAt: -1 }).lean();
  return success(res, { data });
});

export const listAdminBanners = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q && req.query.q.trim()) {
    const regex = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { subtitle: regex }];
  }
  if (req.query.active === 'true') filter.active = true;
  if (req.query.active === 'false') filter.active = false;

  if (req.query.placement && req.query.placement.trim()) {
    const p = String(req.query.placement).trim().toLowerCase();
    if (p === 'offer' || p === 'offers') {
      filter.placement = { $in: ['offer', 'offers'] };
    } else if (p === 'hero' || p === 'home') {
      filter.placement = { $in: ['hero', 'home'] };
    } else {
      filter.placement = p;
    }
  }

  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const result = await paginateWithCursor(Banner, filter, {
    limit,
    cursor: req.query.cursor,
    direction: req.query.direction,
    includeTotal: true,
  });
  return success(res, result);
});

export const createBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  await writeAudit(req, 'banner_created', 'Banner', banner._id, { title: banner.title });
  return success(res, { status: 201, message: 'Banner created', data: banner });
});

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found');
  const oldImage = banner.image?.publicId;
  Object.assign(banner, req.body);
  await banner.save();
  if (oldImage && oldImage !== banner.image?.publicId) await destroyImage(oldImage);
  await writeAudit(req, 'banner_updated', 'Banner', banner._id, { title: banner.title });
  return success(res, { message: 'Banner updated', data: banner });
});

export const archiveBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found');
  banner.active = false;
  await banner.save();
  await writeAudit(req, 'banner_disabled', 'Banner', banner._id, { title: banner.title });
  return success(res, { message: 'Banner disabled' });
});
