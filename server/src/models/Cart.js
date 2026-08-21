import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['product', 'bundle'], default: 'product', required: true },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
    required() { return this.itemType === 'product'; },
  },
  bundle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bundle',
    default: null,
    required() { return this.itemType === 'bundle'; },
  },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  quantity: { type: Number, min: 1, max: 20, default: 1 },
  customerInputs: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

cartItemSchema.pre('validate', function validateCartItem(next) {
  if (this.itemType === 'bundle') {
    this.product = null;
    this.variantId = null;
    if (!this.bundle) this.invalidate('bundle', 'Bundle is required for bundle cart items');
  } else {
    this.bundle = null;
    if (!this.product) this.invalidate('product', 'Product is required for product cart items');
  }
  next();
});

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items: { type: [cartItemSchema], default: [] },
  lastActivityAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['active', 'abandoned', 'converted'], default: 'active', index: true },
  recoveryNote: { type: String, default: '' },
}, { timestamps: true });
cartSchema.index({ status: 1, lastActivityAt: 1 });
export default mongoose.model('Cart', cartSchema);
