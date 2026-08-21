import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  headline: { type: String, default: '', maxlength: 200 },
  description: { type: String, default: '', maxlength: 500 },
  badge: { type: String, default: 'Limited offer', maxlength: 100 },
  image: { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  discountType: { type: String, enum: ['percent', 'fixed', 'display_only'], default: 'display_only' },
  discountValue: { type: Number, default: 0, min: 0 },
  scope: { type: String, enum: ['targeted', 'all'], default: 'targeted' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  bundles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bundle' }],
  // Legacy singular field retained for old records/frontends. New writes use bundles[].
  bundle: { type: mongoose.Schema.Types.ObjectId, ref: 'Bundle', default: null },
  buttonText: { type: String, default: 'Explore offer', maxlength: 100 },
  buttonLink: { type: String, default: '/products', maxlength: 500 },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  active: { type: Boolean, default: true, index: true },
  displayOrder: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

schema.pre('validate', function validatePromotion(next) {
  if (this.discountType === 'percent' && Number(this.discountValue) > 100) this.invalidate('discountValue', 'Percentage discount cannot exceed 100');
  if (this.discountType === 'display_only') this.discountValue = 0;
  if (this.startsAt && this.endsAt && new Date(this.endsAt) <= new Date(this.startsAt)) this.invalidate('endsAt', 'Promotion end date must be after start date');
  const hasTargets = (this.products?.length || 0) + (this.categories?.length || 0) + (this.bundles?.length || 0) + (this.bundle ? 1 : 0) > 0;
  if (this.scope !== 'all' && this.discountType !== 'display_only' && !hasTargets) this.invalidate('scope', 'Targeted promotion needs at least one product, category, or bundle');
  next();
});

schema.index({ active: 1, deletedAt: 1, displayOrder: 1, startsAt: 1, endsAt: 1 });
export default mongoose.model('Promotion', schema);
