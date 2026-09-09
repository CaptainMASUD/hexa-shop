import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const recentSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  viewedAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, maxlength: 100 },
  username: { type: String, trim: true, lowercase: true, sparse: true, unique: true, index: true },
  email: { type: String, trim: true, lowercase: true, required: true, unique: true, index: true },
  password: { type: String, required: true, minlength: 8, select: false },
  phone: { type: String, trim: true, default: '' },
  avatar: { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  roleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
  permissions: { type: [String], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  isMasterAdmin: { type: Boolean, default: false },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  recentlyViewed: { type: [recentSchema], default: [] },
  walletBalance: { type: Number, default: 0, min: 0 },
  loyaltyPoints: { type: Number, default: 0, min: 0 },
  referralCode: { type: String, unique: true, sparse: true, index: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referralStats: { signups: { type: Number, default: 0 }, rewardedOrders: { type: Number, default: 0 }, earned: { type: Number, default: 0 } },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: '', select: false },
  isEmailVerified: { type: Boolean, default: false, index: true },
  emailVerificationToken: { type: String, default: null, select: false },
  emailVerificationExpires: { type: Date, default: null, select: false },
  lastVerificationEmailSentAt: { type: Date, default: null },
  passwordResetToken: { type: String, default: null, select: false },
  passwordResetExpires: { type: Date, default: null, select: false },
  lastPasswordResetEmailSentAt: { type: Date, default: null },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.index({ createdAt: -1, _id: -1 });
userSchema.index({ role: 1, _id: -1 });
userSchema.index({ isActive: 1, _id: -1 });

userSchema.pre('validate', function ensureReferralCode(next) {
  if (!this.referralCode) this.referralCode = `HEXA${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(value) { return bcrypt.compare(value, this.password); };
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id, name: this.name, username: this.username, email: this.email, phone: this.phone, avatar: this.avatar, role: this.role,
    permissions: this.permissions, isActive: this.isActive, isEmailVerified: this.isEmailVerified, createdAt: this.createdAt, lastLoginAt: this.lastLoginAt,
    walletBalance: this.walletBalance, loyaltyPoints: this.loyaltyPoints, referralCode: this.referralCode,
    referralStats: this.referralStats, twoFactorEnabled: this.twoFactorEnabled,
  };
};
export default mongoose.model('User', userSchema);
