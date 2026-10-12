import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  previousStock: { type: Number, required: true },
  quantityChanged: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: { type: String, required: true, trim: true },
  purchasePrice: { type: Number, min: 0, default: 0 },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

stockMovementSchema.index({ createdAt: -1, _id: -1 });
stockMovementSchema.index({ product: 1, _id: -1 });
stockMovementSchema.index({ product: 1, createdAt: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
