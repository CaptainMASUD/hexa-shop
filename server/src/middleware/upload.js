import multer from 'multer';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const allowedExtensions = /\.(jpe?g|png|webp|avif)$/i;

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const valid = allowedMime.has(file.mimetype) && allowedExtensions.test(file.originalname || '');
    cb(valid ? null : new ApiError(400, 'Only JPG, PNG, WEBP, or AVIF images are allowed'), valid);
  },
});
