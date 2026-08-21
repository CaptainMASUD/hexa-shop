import PaymentMethod from '../models/PaymentMethod.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { toSlug } from '../utils/slug.js';
import { destroyImage } from '../services/cloudinaryService.js';
import { writeAudit } from '../services/auditService.js';

export const listPaymentMethods = asyncHandler(async (_req, res) => {
  const data = await PaymentMethod.find({ active: true }).sort({ displayOrder: 1, name: 1 }).lean();
  return success(res, { data });
});

export const listAdminPaymentMethods = asyncHandler(async (_req, res) => {
  const data = await PaymentMethod.find().sort({ displayOrder: 1, name: 1 }).lean();
  return success(res, { data });
});

export const createPaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.create({ ...req.body, slug: toSlug(req.body.slug || req.body.name) });
  await writeAudit(req, 'payment_method_created', 'PaymentMethod', method._id, { name: method.name });
  return success(res, { status: 201, message: 'Payment method created', data: method });
});

export const updatePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findById(req.params.id);
  if (!method) throw new ApiError(404, 'Payment method not found');
  const oldLogo = method.logo?.publicId;
  Object.assign(method, { ...req.body, slug: toSlug(req.body.slug || req.body.name) });
  await method.save();
  if (oldLogo && oldLogo !== method.logo?.publicId) await destroyImage(oldLogo);
  await writeAudit(req, 'payment_method_updated', 'PaymentMethod', method._id, { name: method.name });
  return success(res, { message: 'Payment method updated', data: method });
});

export const archivePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findById(req.params.id);
  if (!method) throw new ApiError(404, 'Payment method not found');
  method.active = false;
  await method.save();
  await writeAudit(req, 'payment_method_disabled', 'PaymentMethod', method._id, { name: method.name });
  return success(res, { message: 'Payment method disabled' });
});
