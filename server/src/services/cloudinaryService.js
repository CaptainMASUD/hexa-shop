import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';

export const uploadBuffer = (buffer, { folder = 'hexa', publicId } = {}) => {
  if (!isCloudinaryConfigured) throw new ApiError(503, 'Image uploads are not configured');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image', overwrite: false },
      (error, result) => {
        if (error) return reject(new ApiError(502, 'Image upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height });
      },
    );
    stream.end(buffer);
  });
};

export const destroyImage = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch (error) {
    console.error('Cloudinary cleanup failed:', error.message);
  }
};
