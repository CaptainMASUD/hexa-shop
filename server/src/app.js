import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { env } from './config/env.js';
import connectDatabase from './config/db.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentMethodRoutes from './routes/paymentMethodRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import engagementRoutes from './routes/engagementRoutes.js';
import commerceFeatureRoutes from './routes/commerceFeatureRoutes.js';
import adminFeatureRoutes from './routes/adminFeatureRoutes.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (env.CLIENT_URLS.some((u) => u && (u === origin || origin.startsWith(u)))) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(hpp());
app.use(compression());

// Auto-connect database in serverless & container environments
app.use(async (_req, _res, next) => {
  try {
    if (env.MONGODB_URL) {
      await connectDatabase();
    }
    next();
  } catch (error) {
    console.error('DB Connection Middleware Error:', error.message);
    next();
  }
});

app.use('/api', apiLimiter);

app.get('/', (_req, res) => res.json({
  success: true,
  message: 'HEXA E-Commerce & Marketplace API Server is running',
  version: '1.0.0',
  data: {
    status: 'healthy',
    environment: env.NODE_ENV,
    endpoints: {
      health: '/api/health',
      v1: '/api/v1',
    },
  },
}));
app.get('/api', (_req, res) => res.json({
  success: true,
  message: 'HEXA API Base',
  data: {
    version: 'v1',
    status: 'online',
  },
}));
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'HEXA API is healthy', data: { environment: env.NODE_ENV } }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payment-methods', paymentMethodRoutes);
app.use('/api/v1/banners', bannerRoutes);
app.use('/api/v1/engagement', engagementRoutes);
app.use('/api/v1/marketplace', commerceFeatureRoutes);
app.use('/api/v1/admin/features', adminFeatureRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
