import mongoose from 'mongoose';
import Product from '../models/Product.js';
import InventoryItem from '../models/InventoryItem.js';
import StockMovement from '../models/StockMovement.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { encryptJson } from '../utils/encryption.js';
import { writeAudit } from '../services/auditService.js';

export const listInventoryItems = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.productId && mongoose.isValidObjectId(req.query.productId)) filter.product = req.query.productId;
  if (req.query.status) filter.status = req.query.status;
  const data = await InventoryItem.find(filter)
    .select('-encryptedPayload')
    .populate('product', 'name slug thumbnail')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return success(res, { data });
});

export const createInventoryItem = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.body.productId);
  if (!product) throw new ApiError(404, 'Product not found');
  if (req.body.variantId && !product.variants.id(req.body.variantId)) throw new ApiError(400, 'Product plan not found');
  const item = await InventoryItem.create({
    product: product._id,
    variantId: req.body.variantId || null,
    previewLabel: req.body.previewLabel,
    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    encryptedPayload: encryptJson(req.body.payload),
    createdBy: req.user._id,
  });
  await writeAudit(req, 'inventory_credential_created', 'InventoryItem', item._id, { productId: product._id, previewLabel: item.previewLabel });
  return success(res, { status: 201, message: 'Protected inventory item created', data: { ...item.toObject(), encryptedPayload: undefined } });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity === 0) throw new ApiError(422, 'Quantity adjustment must be a non-zero whole number');
  const product = await Product.findById(req.params.productId);
  if (!product) throw new ApiError(404, 'Product not found');
  let previousStock;
  let newStock;
  let variantId = req.body.variantId || null;
  if (variantId) {
    const variant = product.variants.id(variantId);
    if (!variant) throw new ApiError(404, 'Product plan not found');
    previousStock = variant.stock;
    newStock = previousStock + quantity;
    if (newStock < 0) throw new ApiError(409, 'Stock cannot become negative');
    variant.stock = newStock;
  } else {
    previousStock = product.stock;
    newStock = previousStock + quantity;
    if (newStock < 0) throw new ApiError(409, 'Stock cannot become negative');
    product.stock = newStock;
  }
  await product.save();
  const movement = await StockMovement.create({
    product: product._id,
    variantId,
    previousStock,
    quantityChanged: quantity,
    newStock,
    reason: String(req.body.reason || 'Manual adjustment').slice(0, 300),
    changedBy: req.user._id,
  });
  await writeAudit(req, 'inventory_changed', 'Product', product._id, { variantId, quantity, reason: movement.reason });
  return success(res, { message: 'Stock updated', data: movement });
});

export const stockHistory = asyncHandler(async (req, res) => {
  const filter = req.query.productId && mongoose.isValidObjectId(req.query.productId) ? { product: req.query.productId } : {};
  const data = await StockMovement.find(filter).populate('product', 'name').populate('changedBy', 'name email').sort({ createdAt: -1 }).limit(300).lean();
  return success(res, { data });
});
