import mongoose from 'mongoose';

const affiliatePayoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 10 },
  paymentMethod: {
    type: String,
    enum: ['bkash', 'nagad', 'rocket', 'bank', 'crypto'],
    required: true,
  },
  accountNumber: { type: String, required: true, trim: true },
  accountType: { type: String, enum: ['personal', 'agent', 'merchant', 'savings'], default: 'personal' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  adminNote: { type: String, default: '', trim: true },
  transactionReference: { type: String, default: '', trim: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt: { type: Date, default: null },
}, { timestamps: true });

affiliatePayoutSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('AffiliatePayout', affiliatePayoutSchema);
