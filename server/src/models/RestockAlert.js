import mongoose from 'mongoose';

const restockAlertSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  status: { type: String, enum: ['pending', 'notified', 'cancelled'], default: 'pending', index: true },
  notifiedAt: { type: Date, default: null },
}, { timestamps: true });

restockAlertSchema.index({ product: 1, variantId: 1, email: 1, status: 1 }, { unique: true });

export default mongoose.model('RestockAlert', restockAlertSchema);
