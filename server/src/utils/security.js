import crypto from 'crypto';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const safeEqual = (left = '', right = '') => {
  const strA = String(left || '').trim();
  const strB = String(right || '').trim();
  if (!strA || !strB) return false;
  const a = Buffer.from(strA);
  const b = Buffer.from(strB);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};
