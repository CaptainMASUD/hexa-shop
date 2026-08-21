import mongoose from 'mongoose';
import { env } from './env.js';

export default async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URL, {
    autoIndex: env.NODE_ENV !== 'production',
    maxPoolSize: 20,
    minPoolSize: env.NODE_ENV === 'production' ? 2 : 0,
    serverSelectionTimeoutMS: 10000,
  });
  // Critical indexes are created explicitly because production disables autoIndex.
  await Promise.all([
    mongoose.connection.collection('couponuserusages').createIndex({ coupon: 1, user: 1 }, { unique: true, name: 'coupon_user_unique' }),
    mongoose.connection.collection('couponusages').createIndex({ order: 1 }, { unique: true, name: 'coupon_order_unique' }),
  ]);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
