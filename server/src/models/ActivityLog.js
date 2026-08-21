import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  type: { type: String, required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: String,
}, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });
export default mongoose.model('ActivityLog', schema);
