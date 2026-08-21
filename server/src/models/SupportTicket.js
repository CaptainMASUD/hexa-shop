import mongoose from 'mongoose';
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 4000 },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });
const schema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, maxlength: 180 },
  category: { type: String, enum: ['order', 'payment', 'product', 'account', 'refund', 'other'], default: 'other' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  status: { type: String, enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'], default: 'open', index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  messages: { type: [messageSchema], default: [] },
  lastReplyAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });
schema.index({ user: 1, updatedAt: -1 });
export default mongoose.model('SupportTicket', schema);
