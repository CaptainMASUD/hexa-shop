import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true, index: true },
  description: { type: String, default: '', maxlength: 300 },
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, required: true, min: 0 },
  minOrder: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: 0, min: 0 },
  usageLimit: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  allowedCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  allowedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  allowedBundles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bundle' }],
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  active: { type: Boolean, default: true, index: true },
  deletedAt: { type: Date, default: null, index: true },
  deletedOriginalCode: { type: String, default: '' },
}, { timestamps: true });

couponSchema.pre('validate', function validateCoupon(next) {
  if (this.type === 'percent' && Number(this.value) > 100) this.invalidate('value', 'Percentage coupon value cannot exceed 100');
  if (this.startsAt && this.endsAt && new Date(this.endsAt) <= new Date(this.startsAt)) this.invalidate('endsAt', 'Coupon end date must be after start date');
  if (Number(this.usageLimit || 0) > 0 && Number(this.usedCount || 0) > Number(this.usageLimit)) this.invalidate('usageLimit', 'Usage limit cannot be below used count');
  next();
});

couponSchema.index({ active: 1, deletedAt: 1, startsAt: 1, endsAt: 1 });
export default mongoose.model('Coupon', couponSchema);
