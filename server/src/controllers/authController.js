import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { env } from '../config/env.js';
import { safeEqual } from '../utils/security.js';
import { createSessionTokens, rotateRefreshToken, revokeRefreshToken, setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../services/tokenService.js';
import { writeAudit } from '../services/auditService.js';
import { generateTotpSecret, verifyTotp } from '../utils/totp.js';
import { encryptJson, decryptJson } from '../utils/encryption.js';

const requestMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') || '' });
const sendAuth = async (req, res, user, message = 'Signed in successfully') => {
  const tokens = await createSessionTokens(user, requestMeta(req));
  setRefreshCookie(res, tokens.refreshToken, tokens.expiresAt);
  return success(res, { message, data: { user: user.toPublicJSON(), accessToken: tokens.accessToken } });
};

export const register = asyncHandler(async (req, res) => {
  const exists = await User.exists({ email: req.body.email });
  if (exists) throw new ApiError(409, 'An account with this email already exists');
  let referredBy = null;
  if (req.body.referralCode) {
    const referrer = await User.findOne({ referralCode: String(req.body.referralCode).trim().toUpperCase(), isActive: true }).select('_id');
    if (referrer) referredBy = referrer._id;
  }
  const { referralCode, ...payload } = req.body;
  const user = await User.create({ ...payload, referredBy, role: 'user' });
  if (referredBy) await User.updateOne({ _id: referredBy }, { $inc: { 'referralStats.signups': 1 } });
  return sendAuth(req, res, user, 'Account created successfully');
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  const valid = user && user.isActive && await user.comparePassword(req.body.password);
  if (!valid) throw new ApiError(401, 'Invalid email or password');
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  await writeAudit(req, 'user_login', 'User', user._id);
  return sendAuth(req, res, user);
});

export const adminLogin = asyncHandler(async (req, res) => {
  const configured = env.ADMIN_USERNAME && env.ADMIN_LOGIN_CODE;
  const valid = configured && safeEqual(req.body.username, env.ADMIN_USERNAME) && safeEqual(req.body.adminCode, env.ADMIN_LOGIN_CODE);
  if (!valid) {
    await writeAudit(req, 'admin_login_failed', 'Auth', null, { usernameProvided: Boolean(req.body.username) });
    throw new ApiError(401, 'Unable to sign in with those credentials');
  }

  let admin = await User.findOne({ isMasterAdmin: true });
  if (!admin) {
    admin = await User.findOne({ email: env.ADMIN_EMAIL });
    if (admin) {
      admin.role = 'admin';
      admin.isMasterAdmin = true;
      admin.isActive = true;
      await admin.save({ validateBeforeSave: false });
    } else {
      admin = await User.create({
        name: 'HEXA Administrator',
        email: env.ADMIN_EMAIL,
        password: `${crypto.randomBytes(32).toString('hex')}Aa1`,
        role: 'admin',
        isMasterAdmin: true,
      });
    }
  }
  if (!admin.isActive) throw new ApiError(401, 'Unable to sign in with those credentials');
  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });
  req.user = admin;
  await writeAudit(req, 'admin_login', 'User', admin._id);
  return sendAuth(req, res, admin, 'Admin signed in successfully');
});

export const refresh = asyncHandler(async (req, res) => {
  const token = getRefreshCookie(req);
  if (!token) throw new ApiError(401, 'Session expired. Please sign in again.');
  const rotated = await rotateRefreshToken(token, requestMeta(req));
  setRefreshCookie(res, rotated.refreshToken, rotated.expiresAt);
  return success(res, { message: 'Session refreshed', data: { user: rotated.user.toPublicJSON(), accessToken: rotated.accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRefreshToken(getRefreshCookie(req));
  clearRefreshCookie(res);
  return success(res, { message: 'Signed out successfully' });
});

export const me = asyncHandler(async (req, res) => success(res, { data: req.user.toPublicJSON() }));

export const updateProfile = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  req.user.phone = req.body.phone;
  await req.user.save();
  return success(res, { message: 'Profile updated successfully', data: req.user.toPublicJSON() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!await user.comparePassword(req.body.currentPassword)) throw new ApiError(400, 'Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  clearRefreshCookie(res);
  await writeAudit(req, 'password_changed', 'User', user._id);
  return success(res, { message: 'Password changed. Please sign in again.' });
});


export const setupTwoFactor = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new ApiError(403, 'Admin access required');
  const secret = generateTotpSecret();
  const user = await User.findById(req.user._id).select('+twoFactorSecret');
  user.twoFactorSecret = encryptJson({ secret });
  user.twoFactorEnabled = false;
  await user.save({ validateBeforeSave: false });
  const label = encodeURIComponent(`HEXA:${user.email}`);
  const issuer = encodeURIComponent('HEXA');
  return success(res, { data: { secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30` } });
});

export const enableTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecret');
  const secret = decryptJson(user.twoFactorSecret)?.secret;
  if (!secret || !verifyTotp(secret, req.body.otp)) throw new ApiError(400, 'Invalid authenticator code');
  user.twoFactorEnabled = true;
  await user.save({ validateBeforeSave: false });
  await writeAudit(req, 'two_factor_enabled', 'User', user._id);
  return success(res, { message: 'Two-factor authentication enabled' });
});

export const disableTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecret');
  const secret = user.twoFactorSecret ? decryptJson(user.twoFactorSecret)?.secret : '';
  if (user.twoFactorEnabled && (!secret || !verifyTotp(secret, req.body.otp))) throw new ApiError(400, 'Invalid authenticator code');
  user.twoFactorEnabled = false; user.twoFactorSecret = '';
  await user.save({ validateBeforeSave: false });
  await writeAudit(req, 'two_factor_disabled', 'User', user._id);
  return success(res, { message: 'Two-factor authentication disabled' });
});
