import mongoose from 'mongoose';
const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '', trim: true },
  image: { url: { type: String, required: true }, publicId: { type: String, default: '' } },
  mobileImage: { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  buttonText: { type: String, default: 'Shop now' },
  buttonLink: { type: String, default: '/products' },
  badge: { type: String, default: '' },
  placement: { type: String, enum: ['hero', 'home', 'offer', 'offers', 'category', 'product', 'bundle', 'midpage'], default: 'hero', index: true },
  targetType: { type: String, enum: ['none', 'category', 'product', 'bundle', 'url'], default: 'none' },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  displayOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true, index: true },
  startDate: Date,
  endDate: Date,
}, { timestamps: true });
bannerSchema.index({ active: 1, placement: 1, displayOrder: 1, startDate: 1, endDate: 1 });
export default mongoose.model('Banner', bannerSchema);
