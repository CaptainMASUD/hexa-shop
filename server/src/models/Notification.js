import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  audience: { type: String, enum: ['user', 'admin', 'all'], default: 'user', index: true },
  type: { type: String, default: 'info', index: true },
  title: { type: String, required: true, maxlength: 160 },
  message: { type: String, required: true, maxlength: 1000 },
  link: { type: String, default: '' },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: Date,
}, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });
schema.index({ audience: 1, createdAt: -1 });
export default mongoose.model('Notification', schema);
