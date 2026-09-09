import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  itemType: {
    type: String,
    enum: ['license_key', 'account_credentials', 'custom'],
    default: 'license_key',
    index: true,
  },
  batchId: { type: String, default: '', index: true },
  encryptedPayload: { type: String, required: true, select: false },
  previewLabel: { type: String, default: '' },
  status: { type: String, enum: ['available', 'reserved', 'assigned', 'disabled'], default: 'available', index: true },
  reservedForOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  assignedToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: Date,
  expiresAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

inventoryItemSchema.index({ createdAt: -1, _id: -1 });
inventoryItemSchema.index({ status: 1, _id: -1 });
inventoryItemSchema.index({ product: 1, variantId: 1, status: 1 });
inventoryItemSchema.index({ product: 1, variantId: 1, itemType: 1, status: 1 });

export default mongoose.model('InventoryItem', inventoryItemSchema);
