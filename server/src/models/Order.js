import mongoose from 'mongoose';

const componentSnapshotSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productSlug: { type: String, required: true },
  productImage: { type: String, default: '' },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  variantName: { type: String, default: '' },
  unitPrice: { type: Number, required: true, min: 0 },
  quantityPerBundle: { type: Number, required: true, min: 1 },
  productType: { type: String, required: true },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['product', 'bundle'], default: 'product', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bundle', default: null },
  productName: { type: String, required: true },
  productSlug: { type: String, required: true },
  productImage: { type: String, default: '' },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  variantName: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  productType: { type: String, required: true },
  bundleSavings: { type: Number, default: 0, min: 0 },
  customerInputs: { type: mongoose.Schema.Types.Mixed, default: {} },
  components: { type: [componentSnapshotSchema], default: [] },
}, { _id: true });

orderItemSchema.pre('validate', function validateOrderItem(next) {
  if (this.itemType === 'bundle') {
    if (!this.bundleId) this.invalidate('bundleId', 'Bundle order item requires bundleId');
    this.productId = null;
    this.variantId = null;
    if (!this.components?.length) this.invalidate('components', 'Bundle order item requires component snapshots');
  } else if (!this.productId) this.invalidate('productId', 'Product order item requires productId');
  next();
});

const timelineSchema = new mongoose.Schema({
  event: { type: String, required: true },
  status: { type: String, default: '' },
  note: { type: String, default: '' },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const deliverySchema = new mongoose.Schema({
  orderItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  summary: { type: String, default: 'Digital delivery' },
  encryptedPayload: { type: String, required: true, select: false },
  deliveredAt: { type: Date, default: Date.now },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: true });

const bundleSummarySchema = new mongoose.Schema({
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bundle', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, min: 1, default: 1 },
  savings: { type: Number, default: 0, min: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  coupon: { code: { type: String, default: '' }, couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null }, discount: { type: Number, default: 0 } },
  // Legacy single bundle summary retained for older clients.
  bundle: { bundleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bundle', default: null }, name: { type: String, default: '' }, discount: { type: Number, default: 0 } },
  bundles: { type: [bundleSummarySchema], default: [] },
  promotion: { discount: { type: Number, default: 0 }, campaigns: [{ promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' }, name: String }] },
  walletApplied: { type: Number, default: 0, min: 0 },
  loyaltyPointsRedeemed: { type: Number, default: 0, min: 0 },
  loyaltyPointsEarned: { type: Number, default: 0, min: 0 },
  rewardsRestored: { type: Boolean, default: false },
  referralRewarded: { type: Boolean, default: false },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'BDT' },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  payment: {
    methodId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod', required: true },
    methodName: { type: String, required: true },
    paymentAccountNumber: { type: String, default: '' },
    accountType: { type: String, default: '' },
    accountName: { type: String, default: '' },
    branchName: { type: String, default: '' },
    chargeNote: { type: String, default: '' },
    instructions: { type: String, default: '' },
    senderNumber: { type: String, default: '' },
    transactionId: { type: String, default: '', trim: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected', 'refunded'], default: 'pending' },
    submittedAt: { type: Date, default: Date.now },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  status: {
    type: String,
    enum: ['pending', 'payment_verification', 'confirmed', 'processing', 'delivered', 'rejected', 'cancelled', 'refunded'],
    default: 'payment_verification',
    index: true,
  },
  internalNotes: { type: String, default: '', select: false },
  timeline: { type: [timelineSchema], default: [] },
  deliveries: { type: [deliverySchema], default: [], select: false },
  inventoryState: { type: String, enum: ['reserved', 'finalized', 'released'], default: 'reserved', index: true },
  inventoryReleased: { type: Boolean, default: false },
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1, createdAt: -1 });
orderSchema.index({ 'payment.methodId': 1, 'payment.transactionId': 1 }, { unique: true });

export default mongoose.model('Order', orderSchema);
