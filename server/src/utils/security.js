import crypto from 'crypto';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const safeEqual = (left = '', right = '') => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};
