import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
};

export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many sign-in attempts. Please try again later.' },
});

export const adminLoginLimiter = rateLimit({
  ...base,
  windowMs: 30 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Unable to sign in. Please try again later.' },
});

export const orderCheckoutLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000,
  limit: 15,
  message: { success: false, message: 'Too many order attempts. Please wait a few minutes before trying again.' },
});

export const restockAlertLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 25,
  message: { success: false, message: 'Too many alert subscriptions submitted. Please try again later.' },
});

export const affiliatePayoutLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: { success: false, message: 'Payout request limit reached. Please try again later.' },
});

export const resendVerificationLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { success: false, message: 'Too many verification email requests. Please wait a while before requesting again.' },
});

export const forgotPasswordLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { success: false, message: 'Too many password reset requests. Please wait a while before requesting again.' },
});

export const resetPasswordLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { success: false, message: 'Too many password reset attempts. Please try again later.' },
});


