import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: '' },
  alt: { type: String, default: '' },
}, { _id: false });

const bundleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  quantity: { type: Number, min: 1, max: 20, default: 1 },
}, { _id: true });

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  code: { type: String, trim: true, uppercase: true, maxlength: 80, default: '' },
  shortDescription: { type: String, default: '', maxlength: 300 },
  description: { type: String, default: '', maxlength: 3000 },
  image: { type: imageSchema, default: undefined },
  bannerImage: { type: imageSchema, default: undefined },
  items: {
    type: [bundleItemSchema],
    validate: [
      (v) => Array.isArray(v) && v.length > 1,
      'Bundle needs at least two items',
    ],
  },
  regularPrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'BDT', uppercase: true, trim: true },
  featured: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  tags: { type: [String], default: [] },
  deletedAt: { type: Date, default: null, index: true },
  deletedOriginalSlug: { type: String, default: '' },
}, { timestamps: true });

schema.pre('validate', function validateBundle(next) {
  const seen = new Set();
  for (const item of this.items || []) {
    const key = `${String(item.product || '')}:${String(item.variantId || '')}`;
    if (seen.has(key)) this.invalidate('items', 'A product/plan can only appear once in a bundle');
    seen.add(key);
  }
  if (Number(this.salePrice || 0) > 0 && Number(this.regularPrice || 0) > 0 && Number(this.salePrice) >= Number(this.regularPrice)) this.invalidate('salePrice', 'Bundle sale price must be lower than regular price');
  if (this.startsAt && this.endsAt && new Date(this.endsAt) <= new Date(this.startsAt)) this.invalidate('endsAt', 'Bundle end date must be after start date');
  next();
});

schema.index({ status: 1, deletedAt: 1, featured: 1, createdAt: -1 });
export default mongoose.model('Bundle', schema);
