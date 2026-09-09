import mongoose from 'mongoose';

const walletCreditPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    payAmount: { type: Number, required: true, min: 1 }, // in BDT (৳)
    creditAmount: { type: Number, required: true, min: 1 }, // base credits
    bonusCredits: { type: Number, default: 0, min: 0 }, // bonus credits
    totalCredits: { type: Number, required: true, min: 1 }, // creditAmount + bonusCredits
    badge: { type: String, default: '', trim: true }, // e.g. "Popular", "Best Value", "10% Extra"
    description: { type: String, default: '', trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

walletCreditPackageSchema.index({ isActive: 1, sortOrder: 1, payAmount: 1 });

export default mongoose.model('WalletCreditPackage', walletCreditPackageSchema);
