import mongoose from 'mongoose';

const productInteractionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  viewCount: { type: Number, default: 1, min: 1 },
  lastViewedAt: { type: Date, default: Date.now, index: true },
  firstViewedAt: { type: Date, default: Date.now },
  inWishlist: { type: Boolean, default: false },
  inCart: { type: Boolean, default: false },
  purchasedCount: { type: Number, default: 0, min: 0 },
  lastPurchasedAt: { type: Date, default: null },
}, { timestamps: true });

// Compound unique index ensuring one consolidated behavioral record per (user, product)
productInteractionSchema.index({ user: 1, product: 1 }, { unique: true });
productInteractionSchema.index({ user: 1, lastViewedAt: -1 });
productInteractionSchema.index({ user: 1, viewCount: -1 });
productInteractionSchema.index({ user: 1, inWishlist: 1 });
productInteractionSchema.index({ user: 1, inCart: 1 });

/**
 * Record or update customer product interaction efficiently without creating runaway records.
 */
productInteractionSchema.statics.recordEvent = async function (userId, productId, eventType, extra = {}) {
  if (!userId || !productId) return null;

  const now = new Date();
  const update = {};

  switch (eventType) {
    case 'view':
      update.$inc = { viewCount: 1 };
      update.$set = { lastViewedAt: now };
      update.$setOnInsert = { firstViewedAt: now };
      break;

    case 'wishlist_add':
      update.$set = { inWishlist: true };
      break;

    case 'wishlist_remove':
      update.$set = { inWishlist: false };
      break;

    case 'cart_add':
      update.$set = { inCart: true };
      break;

    case 'cart_remove':
      update.$set = { inCart: false };
      break;

    case 'purchase':
      update.$inc = { purchasedCount: Number(extra.quantity || 1) };
      update.$set = { lastPurchasedAt: now, inCart: false };
      break;

    default:
      return null;
  }

  return this.findOneAndUpdate(
    { user: userId, product: productId },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export default mongoose.model('ProductInteraction', productInteractionSchema);
