import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  source: {
    type: String,
    enum: [
      'admin',
      'order',
      'refund',
      'referral',
      'reward',
      'adjustment',
      'wallet_credit_purchase',
      'payout_request',
      'payout_refund',
    ],
    default: 'adjustment',
  },
  reference: { type: mongoose.Schema.Types.ObjectId, default: null },
  note: { type: String, default: '', maxlength: 300 },
  balanceAfter: { type: Number, required: true, min: 0 },
}, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });
schema.index({ createdAt: -1, _id: -1 });
export default mongoose.model('WalletTransaction', schema);
