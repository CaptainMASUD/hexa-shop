import { Router } from 'express';
import {
  register,
  login,
  adminRegister,
  adminLogin,
  refresh,
  logout,
  me,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authenticateUser } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import {
  authLimiter,
  adminLoginLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimiters.js';
import { checkFraudBlock } from '../middleware/fraudDetection.js';
import { verifyBotProtection } from '../middleware/botShield.js';
import { validateBody } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  adminRegisterSchema,
  adminLoginSchema,
  profileSchema,
  passwordSchema,
  twoFactorSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validations/schemas.js';

const router = Router();
router.post('/register', authLimiter, checkFraudBlock, verifyBotProtection, validateBody(registerSchema), register);
router.post('/login', authLimiter, checkFraudBlock, verifyBotProtection, validateBody(loginSchema), login);
router.post('/verify-email', authLimiter, validateBody(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, validateBody(resendVerificationSchema), resendVerification);
router.post('/forgot-password', forgotPasswordLimiter, checkFraudBlock, verifyBotProtection, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', resetPasswordLimiter, checkFraudBlock, validateBody(resetPasswordSchema), resetPassword);
router.post('/admin/register', authLimiter, validateBody(adminRegisterSchema), adminRegister);
router.post('/admin/login', adminLoginLimiter, validateBody(adminLoginSchema), adminLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateUser, me);
router.patch('/profile', authenticateUser, validateBody(profileSchema), updateProfile);
router.post('/avatar', authenticateUser, uploadImage.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticateUser, removeAvatar);
router.patch('/password', authenticateUser, validateBody(passwordSchema), changePassword);
router.post('/2fa/setup', authenticateUser, setupTwoFactor);
router.post('/2fa/enable', authenticateUser, validateBody(twoFactorSchema), enableTwoFactor);
router.post('/2fa/disable', authenticateUser, validateBody(twoFactorSchema), disableTwoFactor);
export default router;
