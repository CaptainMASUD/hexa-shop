import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const authenticateUser = asyncHandler(async (req, _res, next) => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired access token');
  }
  if (payload.type !== 'access') throw new ApiError(401, 'Invalid access token');
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Account is unavailable');
  req.user = user;
  next();
});

export const authenticateOptionalUser = asyncHandler(async (req, _res, next) => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.type === 'access') {
      const user = await User.findById(payload.sub);
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch {
    // Graceful fallback for optional auth
  }
  next();
});

export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to perform this action'));
  return next();
};

export const authorizePermissions = (...permissions) => (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentication required'));
  if (req.user.isMasterAdmin) return next();
  if (req.user.role !== 'admin') return next(new ApiError(403, 'Administrator access required'));
  // Existing admins without a custom role keep full access. Once roleRef is assigned,
  // the explicit permission list becomes authoritative.
  if (!req.user.roleRef) return next();
  if (!permissions.length || permissions.every((p) => req.user.permissions?.includes(p))) return next();
  return next(new ApiError(403, 'You do not have the required permission'));
};
