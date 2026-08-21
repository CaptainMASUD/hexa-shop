import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  logo: { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  qrCode: { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  gatewayType: { type: String, enum: ['manual', 'external', 'wallet'], default: 'manual' },
  accountNumber: { type: String, default: '', trim: true },
  accountType: { type: String, default: '', trim: true },
  accountName: { type: String, default: '', trim: true },
  branchName: { type: String, default: '', trim: true },
  chargeNote: { type: String, default: '', trim: true },
  instructions: { type: String, default: '', maxlength: 5000 },
  publicConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  active: { type: Boolean, default: true, index: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

paymentMethodSchema.index({ active: 1, displayOrder: 1 });
export default mongoose.model('PaymentMethod', paymentMethodSchema);
