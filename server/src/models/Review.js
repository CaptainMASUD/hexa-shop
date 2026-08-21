import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, default: '', maxlength: 120 },
  comment: { type: String, required: true, maxlength: 1500 },
  verifiedPurchase: { type: Boolean, default: false },
  status: { type: String, enum: ['published', 'pending', 'hidden'], default: 'published', index: true },
  helpfulCount: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ product: 1, user: 1 }, { unique: true });
schema.index({ product: 1, status: 1, createdAt: -1 });
export default mongoose.model('Review', schema);
