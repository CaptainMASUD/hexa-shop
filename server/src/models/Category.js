import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  description: { type: String, default: '', maxlength: 500 },
  image: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  displayOrder: { type: Number, default: 0, index: true },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
}, { timestamps: true });

categorySchema.index({ status: 1, displayOrder: 1, name: 1 });

export default mongoose.model('Category', categorySchema);
