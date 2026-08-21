import 'dotenv/config';

const parseList = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean);

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  CLIENT_URLS: parseList(process.env.CLIENT_URL || 'http://localhost:5173'),
  MONGODB_URL: process.env.MONGODB_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIREY || process.env.ACCESS_TOKEN_EXPIRY || '1d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || '',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIREY || process.env.REFRESH_TOKEN_EXPIRY || '10d',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_LOGIN_CODE: process.env.adminlogincode || process.env.ADMIN_LOGIN_CODE || '',
  INVENTORY_ENCRYPTION_KEY: process.env.INVENTORY_ENCRYPTION_KEY || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB || 5),
};

export const isProduction = env.NODE_ENV === 'production';

export const validateProductionEnv = () => {
  const alwaysRequired = ['MONGODB_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
  const productionRequired = ['ADMIN_USERNAME', 'ADMIN_LOGIN_CODE', 'INVENTORY_ENCRYPTION_KEY'];
  const missing = alwaysRequired.filter((key) => !env[key]);
  if (isProduction) missing.push(...productionRequired.filter((key) => !env[key]));
  if (missing.length) throw new Error(`Missing required environment variables: ${[...new Set(missing)].join(', ')}`);
};
