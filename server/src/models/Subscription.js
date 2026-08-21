import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  unitIndex: { type: Number, min: 0, default: 0 },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  productName: { type: String, required: true },
  planName: { type: String, default: '' },
  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null, index: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },
  autoRenew: { type: Boolean, default: false },
  reminderDays: { type: Number, default: 7 },
}, { timestamps: true });
schema.index({ user: 1, status: 1, expiresAt: 1 });
schema.index({ order: 1, orderItemId: 1, product: 1, variantId: 1, unitIndex: 1 }, { unique: true });
export default mongoose.model('Subscription', schema);
