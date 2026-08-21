import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { uploadBuffer } from '../services/cloudinaryService.js';
import { writeAudit } from '../services/auditService.js';

export const uploadAdminImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Select an image to upload');
  const folder = `hexa/${String(req.body.folder || 'uploads').replace(/[^a-z0-9-_]/gi, '').slice(0, 40) || 'uploads'}`;
  const uploaded = await uploadBuffer(req.file.buffer, { folder });
  await writeAudit(req, 'image_uploaded', 'Media', null, { publicId: uploaded.publicId, folder });
  return success(res, { status: 201, message: 'Image uploaded successfully', data: uploaded });
});
