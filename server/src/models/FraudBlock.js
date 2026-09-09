import mongoose from 'mongoose';

const fraudBlockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ip', 'phone', 'email', 'account'],
    required: true,
    index: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
    default: 'Suspicious activity or fraud attempt',
  },
  blockedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
    index: true,
  },
}, { timestamps: true });

fraudBlockSchema.index({ type: 1, value: 1 }, { unique: true });

export default mongoose.model('FraudBlock', fraudBlockSchema);
