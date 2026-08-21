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
