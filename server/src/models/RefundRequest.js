import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  reason: { type: String, required: true, maxlength: 1000 },
  requestedAmount: { type: Number, min: 0, required: true },
  status: { type: String, enum: ['requested', 'reviewing', 'approved', 'rejected', 'completed'], default: 'requested', index: true },
  adminNote: { type: String, default: '', maxlength: 2000 },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: Date,
}, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
export default mongoose.model('RefundRequest', schema);
