import mongoose from 'mongoose';

const walletCreditPurchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: { type: String, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletCreditPackage', default: null },
    packageName: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, min: 1 }, // Amount paid in BDT
    credits: { type: Number, required: true, min: 1 }, // Base credits
    bonusCredits: { type: Number, default: 0, min: 0 }, // Bonus credits
    totalCredits: { type: Number, required: true, min: 1 }, // Total credited upon approval
    paymentMethod: { type: String, required: true, trim: true }, // e.g. "bKash Personal"
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod', default: null },
    transactionId: { type: String, default: '', trim: true },
    senderNumber: { type: String, default: '', trim: true },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    customerNote: { type: String, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', maxlength: 500 },
    walletTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction', default: null },
    adminNotificationEmailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

walletCreditPurchaseSchema.index({ createdAt: -1, _id: -1 });
walletCreditPurchaseSchema.index({ status: 1, createdAt: -1, _id: -1 });
walletCreditPurchaseSchema.index({ user: 1, createdAt: -1, _id: -1 });

export default mongoose.model('WalletCreditPurchase', walletCreditPurchaseSchema);
