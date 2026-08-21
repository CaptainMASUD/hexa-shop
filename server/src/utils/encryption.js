import crypto from 'crypto';
import { env } from '../config/env.js';
import ApiError from './ApiError.js';

const getKey = () => {
  if (!env.INVENTORY_ENCRYPTION_KEY) {
    throw new ApiError(500, 'Digital credential encryption is not configured');
  }
  return crypto.createHash('sha256').update(env.INVENTORY_ENCRYPTION_KEY).digest();
};

export const encryptJson = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

export const decryptJson = (payload) => {
  if (!payload) return null;
  try {
    const [ivPart, tagPart, dataPart] = payload.split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivPart, 'base64'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    throw new ApiError(500, 'Unable to decrypt protected delivery data');
  }
};
