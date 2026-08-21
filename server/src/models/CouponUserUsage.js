import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  count: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

schema.index({ coupon: 1, user: 1 }, { unique: true });
export default mongoose.model('CouponUserUsage', schema);
