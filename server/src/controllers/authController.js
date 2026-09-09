import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { env } from '../config/env.js';
import { hashToken, safeEqual } from '../utils/security.js';
import { createSessionTokens, rotateRefreshToken, revokeRefreshToken, setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../services/tokenService.js';
import { writeAudit } from '../services/auditService.js';
import { generateTotpSecret, verifyTotp } from '../utils/totp.js';
import { encryptJson, decryptJson } from '../utils/encryption.js';
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { uploadBuffer, destroyImage } from '../services/cloudinaryService.js';

const requestMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') || '' });
const sendAuth = async (req, res, user, message = 'Signed in successfully') => {
  const tokens = await createSessionTokens(user, requestMeta(req));
  setRefreshCookie(res, tokens.refreshToken, tokens.expiresAt);
  return success(res, { message, data: { user: user.toPublicJSON(), accessToken: tokens.accessToken } });
};

export const register = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const exists = await User.exists({ email });
  if (exists) throw new ApiError(409, 'An account with this email already exists');
  let referredBy = null;
  if (req.body.referralCode) {
    const referrer = await User.findOne({ referralCode: String(req.body.referralCode).trim().toUpperCase(), isActive: true }).select('_id');
    if (referrer) referredBy = referrer._id;
  }
  const { referralCode, ...payload } = req.body;

  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawVerificationToken);
  const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  const user = await User.create({
    ...payload,
    email,
    referredBy,
    role: 'user',
    isEmailVerified: false,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: verificationExpires,
    lastVerificationEmailSentAt: new Date(),
  });

  if (referredBy) await User.updateOne({ _id: referredBy }, { $inc: { 'referralStats.signups': 1 } });
  await writeAudit(req, 'user_registered', 'User', user._id, { email });

  sendEmailVerificationEmail(user, rawVerificationToken).catch((err) =>
    console.error('[AuthController] Failed to send verification email:', err?.message || err)
  );

  return success(res, {
    status: 201,
    message: 'Account created successfully. We sent a verification link to your email. Please verify your email before logging in.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: false,
      },
      requiresVerification: true,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const user = await User.findOne({ email }).select('+password');
  const valid = user && user.isActive && await user.comparePassword(req.body.password);
  if (!valid) throw new ApiError(401, 'Invalid email or password');

  if (user.isEmailVerified === false) {
    throw new ApiError(403, 'Please verify your email before logging in.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  await writeAudit(req, 'user_login', 'User', user._id);
  return sendAuth(req, res, user);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const rawToken = String(req.body.token || '').trim();
  if (!rawToken) throw new ApiError(400, 'Verification token is required');

  const hashedToken = hashToken(rawToken);
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw new ApiError(400, 'Verification link is invalid or has expired.');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  await writeAudit(req, 'email_verified', 'User', user._id, { email: user.email });

  return success(res, {
    message: 'Email verified successfully! You can now log in.',
    data: {
      email: user.email,
      isEmailVerified: true,
    },
  });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) throw new ApiError(400, 'Email address is required');

  const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');

  const genericSuccess = 'If an unverified account exists with that email, a verification link has been sent.';

  if (!user) {
    return success(res, { message: genericSuccess });
  }

  if (user.isEmailVerified) {
    return success(res, { message: 'This email address is already verified. You can log in directly.' });
  }

  if (user.lastVerificationEmailSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - user.lastVerificationEmailSentAt.getTime()) / 1000);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      throw new ApiError(429, `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting another verification email.`);
    }
  }

  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = hashToken(rawVerificationToken);
  user.emailVerificationExpires = new Date(Date.now() + 30 * 60 * 1000);
  user.lastVerificationEmailSentAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendEmailVerificationEmail(user, rawVerificationToken).catch((err) =>
    console.error('[AuthController] Failed to resend verification email:', err?.message || err)
  );

  await writeAudit(req, 'resend_verification_requested', 'User', user._id, { email });

  return success(res, { message: 'A new verification link has been sent to your email.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) throw new ApiError(400, 'Email address is required');

  const genericSuccess = 'If an account exists for this email, a password reset link has been sent.';

  const user = await User.findOne({ email, isActive: true }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return success(res, { message: genericSuccess });
  }

  // Enforce 60-second cooldown per account
  if (user.lastPasswordResetEmailSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - user.lastPasswordResetEmailSentAt.getTime()) / 1000);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      throw new ApiError(429, `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting another password reset email.`);
    }
  }

  const rawResetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = hashToken(rawResetToken);
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  user.lastPasswordResetEmailSentAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendPasswordResetEmail(user, rawResetToken).catch((err) =>
    console.error('[AuthController] Failed to send password reset email:', err?.message || err)
  );

  await writeAudit(req, 'password_reset_requested', 'User', user._id, { email });

  return success(res, { message: genericSuccess });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const rawToken = String(req.body.token || '').trim();
  if (!rawToken) throw new ApiError(400, 'Reset token is required');

  const hashedToken = hashToken(rawToken);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +password');

  if (!user) {
    throw new ApiError(400, 'This password reset link is invalid or has expired.');
  }

  // Set new password (hashed automatically by userSchema pre-save hook)
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Invalidate all active sessions for this user
  await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  clearRefreshCookie(res);

  await writeAudit(req, 'password_reset_completed', 'User', user._id, { email: user.email });

  return success(res, { message: 'Password reset successfully. Please log in with your new password.' });
});

export const adminRegister = asyncHandler(async (req, res) => {
  const secretCode = env.ADMIN_REGISTER_CODE || 'HEXA-ADMIN-SECRET-2026';
  const isCodeValid = safeEqual(String(req.body.registerCode).trim(), secretCode);
  if (!isCodeValid) {
    await writeAudit(req, 'admin_register_failed_code', 'Auth', null, { username: req.body.username });
    throw new ApiError(403, 'Invalid admin registration security code');
  }

  const username = String(req.body.username).trim().toLowerCase();
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : `${username}@hexa.local`;

  const existing = await User.findOne({
    $or: [
      { username },
      { email },
    ],
  });
  if (existing) {
    throw new ApiError(409, existing.username === username ? 'This admin username is already taken' : 'This email is already registered');
  }

  const adminCount = await User.countDocuments({ role: 'admin' });

  const admin = await User.create({
    name: req.body.name || username,
    username,
    email,
    password: req.body.password,
    role: 'admin',
    isMasterAdmin: adminCount === 0,
    isActive: true,
    isEmailVerified: true,
  });

  await writeAudit(req, 'admin_registered', 'User', admin._id, { username });
  return sendAuth(req, res, admin, 'Admin account registered successfully');
});

export const adminLogin = asyncHandler(async (req, res) => {
  const identifier = String(req.body.username).trim().toLowerCase();
  const password = String(req.body.password || '');

  const admin = await User.findOne({
    $or: [
      { username: identifier },
      { email: identifier },
    ],
    role: 'admin',
  }).select('+password +twoFactorSecret');

  const valid = admin && admin.isActive && (await admin.comparePassword(password));
  if (!valid) {
    await writeAudit(req, 'admin_login_failed', 'Auth', admin?._id || null, { identifier });
    throw new ApiError(401, 'Invalid admin username or password');
  }

  // If Two-Factor Authentication is enabled for this admin account
  if (admin.twoFactorEnabled) {
    const otp = String(req.body.otp || '').trim();
    if (!otp) {
      return success(res, {
        message: 'Two-factor authentication required',
        data: { requires2FA: true },
      });
    }

    const secret = admin.twoFactorSecret ? decryptJson(admin.twoFactorSecret)?.secret : '';
    if (!secret || !verifyTotp(secret, otp)) {
      await writeAudit(req, 'admin_login_failed_2fa', 'Auth', admin._id, { identifier });
      throw new ApiError(401, 'Invalid 2FA authenticator code');
    }
  }

  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });
  req.user = admin;
  await writeAudit(req, 'admin_login', 'User', admin._id);
  return sendAuth(req, res, admin, 'Admin signed in successfully');
});

export const refresh = asyncHandler(async (req, res) => {
  const token = getRefreshCookie(req);
  if (!token) {
    return res.status(200).json({
      success: true,
      message: 'No active session',
      data: null,
    });
  }
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
  if (req.body.name !== undefined) req.user.name = req.body.name;
  if (req.body.phone !== undefined) req.user.phone = req.body.phone;
  if (req.body.avatar !== undefined) {
    if (req.user.avatar?.publicId && req.body.avatar?.publicId && req.user.avatar.publicId !== req.body.avatar.publicId) {
      await destroyImage(req.user.avatar.publicId);
    }
    req.user.avatar = req.body.avatar;
  }
  await req.user.save();
  return success(res, { message: 'Profile updated successfully', data: req.user.toPublicJSON() });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Select an image to upload as your profile picture');
  
  if (req.user.avatar?.publicId) {
    await destroyImage(req.user.avatar.publicId);
  }
  
  const folder = `hexa/avatars/${req.user.role === 'admin' ? 'admins' : 'users'}`;
  const uploaded = await uploadBuffer(req.file.buffer, { folder });
  
  req.user.avatar = {
    url: uploaded.url,
    publicId: uploaded.publicId,
  };
  await req.user.save();
  
  await writeAudit(req, 'avatar_updated', 'User', req.user._id, { publicId: uploaded.publicId });
  return success(res, {
    message: 'Profile picture updated successfully',
    data: req.user.toPublicJSON(),
  });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  if (req.user.avatar?.publicId) {
    await destroyImage(req.user.avatar.publicId);
  }
  req.user.avatar = { url: '', publicId: '' };
  await req.user.save();
  
  await writeAudit(req, 'avatar_removed', 'User', req.user._id);
  return success(res, {
    message: 'Profile picture removed',
    data: req.user.toPublicJSON(),
  });
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
