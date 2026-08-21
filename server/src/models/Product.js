import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: '' },
  alt: { type: String, default: '' },
}, { _id: false });

const customFieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  type: { type: String, enum: ['text', 'number', 'select'], default: 'text' },
  placeholder: { type: String, default: '' },
  helpText: { type: String, default: '' },
  required: { type: Boolean, default: true },
  options: { type: [String], default: [] },
}, { _id: false });

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  duration: { type: String, default: '' },
  regularPrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0 },
  reservedQuantity: { type: Number, min: 0, default: 0 },
  soldQuantity: { type: Number, min: 0, default: 0 },
  sku: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  shortDescription: { type: String, default: '', maxlength: 300 },
  description: { type: String, default: '', maxlength: 6000 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subcategory: { type: String, default: '', trim: true },
  regularPrice: { type: Number, min: 0, default: 0 },
  salePrice: { type: Number, min: 0, default: 0 },
  currency: { type: String, default: 'BDT', uppercase: true },
  stock: { type: Number, min: 0, default: 0 },
  reservedQuantity: { type: Number, min: 0, default: 0 },
  soldQuantity: { type: Number, min: 0, default: 0 },
  lowStockThreshold: { type: Number, min: 0, default: 5 },
  thumbnail: { type: imageSchema, default: undefined },
  galleryImages: { type: [imageSchema], default: [] },
  bannerImage: { type: imageSchema, default: undefined },
  featured: { type: Boolean, default: false, index: true },
  popular: { type: Boolean, default: false, index: true },
  newArrival: { type: Boolean, default: false },
  ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  seo: { title: { type: String, default: '' }, description: { type: String, default: '' }, keywords: { type: [String], default: [] } },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
  deliveryType: { type: String, enum: ['manual', 'instant', 'scheduled'], default: 'manual' },
  productType: {
    type: String,
    enum: ['subscription', 'game', 'tool', 'software', 'digital-product', 'account', 'license', 'other'],
    default: 'digital-product',
    index: true,
  },
  tags: { type: [String], default: [] },
  searchKeywords: { type: [String], default: [] },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  customFields: { type: [customFieldSchema], default: [] },
  variants: { type: [variantSchema], default: [] },
}, { timestamps: true });

productSchema.virtual('stockStatus').get(function stockStatus() {
  const stock = this.variants?.length
    ? this.variants.reduce((sum, variant) => sum + (variant.active ? variant.stock : 0), 0)
    : this.stock;
  if (stock <= 0) return 'out_of_stock';
  if (stock <= this.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, featured: 1, createdAt: -1 });
productSchema.index({ status: 1, popular: 1, soldQuantity: -1 });
productSchema.index({ name: 'text', shortDescription: 'text', tags: 'text', searchKeywords: 'text' }, { weights: { name: 10, tags: 6, searchKeywords: 5, shortDescription: 2 } });

export default mongoose.model('Product', productSchema);
