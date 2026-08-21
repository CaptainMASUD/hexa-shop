import User from '../models/User.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { writeAudit } from '../services/auditService.js';

export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.active === 'true') filter.isActive = true;
  if (req.query.active === 'false') filter.isActive = false;
  if (req.query.q) {
    const regex = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return success(res, { data: users.map(({ password: _p, ...user }) => user), meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new ApiError(404, 'User not found');
  const [summary] = await Order.aggregate([
    { $match: { user: user._id } },
    { $group: { _id: null, totalOrders: { $sum: 1 }, totalSpending: { $sum: { $cond: [{ $eq: ['$payment.status', 'verified'] }, '$total', 0] } } } },
  ]);
  const orders = await Order.find({ user: user._id }).select('orderNumber total status payment.status createdAt').sort({ createdAt: -1 }).limit(20).lean();
  return success(res, { data: { user, summary: summary || { totalOrders: 0, totalSpending: 0 }, recentOrders: orders } });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isMasterAdmin) throw new ApiError(403, 'The master administrator cannot be deactivated here');
  user.isActive = Boolean(req.body.isActive);
  await user.save({ validateBeforeSave: false });
  await writeAudit(req, user.isActive ? 'user_activated' : 'user_deactivated', 'User', user._id, { email: user.email });
  return success(res, { message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user.toPublicJSON() });
});
