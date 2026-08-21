import Banner from '../models/Banner.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { destroyImage } from '../services/cloudinaryService.js';
import { writeAudit } from '../services/auditService.js';

export const listBanners = asyncHandler(async (_req, res) => {
  const now = new Date();
  const data = await Banner.find({
    active: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] },
    ],
  }).sort({ displayOrder: 1 }).lean();
  return success(res, { data });
});

export const listAdminBanners = asyncHandler(async (_req, res) => success(res, { data: await Banner.find().sort({ displayOrder: 1 }).lean() }));

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
