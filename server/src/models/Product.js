import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: '' },
  alt: { type: String, default: '' },
}, { _id: false });

const customFieldValidationSchema = new mongoose.Schema({
  minLength: { type: Number, min: 0 },
  maxLength: { type: Number, min: 0 },
  min: { type: Number },
  max: { type: Number },
  regex: { type: String, default: '' },
  customErrorMessage: { type: String, default: '' },
}, { _id: false });

const customFieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['text', 'number', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'toggle', 'date'],
    default: 'text',
  },
  placeholder: { type: String, default: '' },
  helpText: { type: String, default: '' },
  required: { type: Boolean, default: true },
  defaultValue: { type: mongoose.Schema.Types.Mixed, default: '' },
  options: { type: [String], default: [] },
  validation: { type: customFieldValidationSchema, default: () => ({}) },
  sortOrder: { type: Number, default: 0 },
}, { _id: true });

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true, default: '' },
  duration: { type: String, default: '' },
  region: { type: String, trim: true, default: '' },
  platform: { type: String, trim: true, default: '' },
  regularPrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0, default: 0 },
  costPrice: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0 },
  unlimitedStock: { type: Boolean, default: false },
  reservedQuantity: { type: Number, min: 0, default: 0 },
  soldQuantity: { type: Number, min: 0, default: 0 },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const fulfillmentConfigSchema = new mongoose.Schema({
  provider: { type: String, default: '', trim: true },
  serviceCode: { type: String, default: '', trim: true },
  autoDeliverKey: { type: Boolean, default: false },
  customInstructions: { type: String, default: '' },
  extra: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true, maxlength: 300 },
  answer: { type: String, required: true, trim: true, maxlength: 2000 },
}, { _id: true });

const guideStepSchema = new mongoose.Schema({
  stepNumber: { type: Number, default: 1 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 1500 },
  imageUrl: { type: String, default: '', trim: true },
}, { _id: true });

const guideSchema = new mongoose.Schema({
  title: { type: String, default: '', trim: true, maxlength: 200 },
  videoUrl: { type: String, default: '', trim: true },
  steps: { type: [guideStepSchema], default: [] },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  brand: { type: String, default: '', trim: true, maxlength: 100 },
  shortDescription: { type: String, default: '', maxlength: 300 },
  description: { type: String, default: '', maxlength: 6000 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subcategory: { type: String, default: '', trim: true },
  regularPrice: { type: Number, min: 0, default: 0 },
  salePrice: { type: Number, min: 0, default: 0 },
  currency: { type: String, default: 'BDT', uppercase: true },
  stock: { type: Number, min: 0, default: 0 },
  allowUnlimitedStock: { type: Boolean, default: false },
  reservedQuantity: { type: Number, min: 0, default: 0 },
  soldQuantity: { type: Number, min: 0, default: 0 },
  lowStockThreshold: { type: Number, min: 0, default: 5 },
  thumbnail: { type: imageSchema, default: undefined },
  galleryImages: { type: [imageSchema], default: [] },
  bannerImage: { type: imageSchema, default: undefined },
  featured: { type: Boolean, default: false, index: true },
  popular: { type: Boolean, default: false, index: true },
  newArrival: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0, index: true },
  ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  seo: { title: { type: String, default: '' }, description: { type: String, default: '' }, keywords: { type: [String], default: [] } },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
  deliveryType: { type: String, enum: ['manual', 'instant', 'scheduled'], default: 'manual' },
  fulfillmentType: {
    type: String,
    enum: ['manual', 'license_key', 'account_credentials', 'api_topup', 'email_delivery', 'auto_delivery', 'custom'],
    default: 'manual',
    index: true,
  },
  fulfillmentConfig: { type: fulfillmentConfigSchema, default: () => ({}) },
  productType: {
    type: String,
    enum: [
      'subscription',
      'game',
      'game_topup',
      'game_license',
      'software',
      'software_license',
      'gift_card',
      'account',
      'digital_account',
      'license',
      'digital-product',
      'tool',
      'other',
    ],
    default: 'digital-product',
    index: true,
  },
  tags: { type: [String], default: [] },
  searchKeywords: { type: [String], default: [] },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  customFields: { type: [customFieldSchema], default: [] },
  variants: { type: [variantSchema], default: [] },
  faqs: { type: [faqSchema], default: [] },
  guide: { type: guideSchema, default: () => ({ steps: [] }) },
}, { timestamps: true });

productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.allowUnlimitedStock) return 'in_stock';
  if (this.variants?.length) {
    const hasUnlimited = this.variants.some((v) => v.active && v.unlimitedStock);
    if (hasUnlimited) return 'in_stock';
    const totalStock = this.variants.reduce((sum, variant) => sum + (variant.active ? variant.stock : 0), 0);
    if (totalStock <= 0) return 'out_of_stock';
    if (totalStock <= this.lowStockThreshold) return 'low_stock';
    return 'in_stock';
  }
  if (this.stock <= 0) return 'out_of_stock';
  if (this.stock <= this.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.index({ createdAt: -1, _id: -1 });
productSchema.index({ status: 1, _id: -1 });
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, featured: 1, createdAt: -1 });
productSchema.index({ status: 1, popular: 1, soldQuantity: -1 });
productSchema.index({ status: 1, productType: 1, createdAt: -1 });
productSchema.index({ name: 'text', shortDescription: 'text', brand: 'text', tags: 'text', searchKeywords: 'text' }, { weights: { name: 10, brand: 8, tags: 6, searchKeywords: 5, shortDescription: 2 } });

export default mongoose.model('Product', productSchema);
