import mongoose from 'mongoose';
import { env } from './env.js';

let cachedConnection = null;

export default async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  mongoose.set('strictQuery', true);

  if (!env.MONGODB_URL) {
    throw new Error('MONGODB_URL environment variable is missing.');
  }

  cachedConnection = mongoose.connect(env.MONGODB_URL, {
    autoIndex: env.NODE_ENV !== 'production',
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  }).then(async (conn) => {
    console.log(`MongoDB connected: ${conn.connection.name}`);
    try {
      if (conn.connection.collection) {
        await Promise.allSettled([
          conn.connection.collection('couponuserusages').createIndex({ coupon: 1, user: 1 }, { unique: true, name: 'coupon_user_unique' }),
          conn.connection.collection('couponusages').createIndex({ order: 1 }, { unique: true, name: 'coupon_order_unique' }),
        ]);
      }
    } catch {
      // Ignored for non-fatal serverless index operations
    }
    return conn.connection;
  }).catch((err) => {
    cachedConnection = null;
    console.error('MongoDB connection error:', err.message);
    throw err;
  });

  return cachedConnection;
}
