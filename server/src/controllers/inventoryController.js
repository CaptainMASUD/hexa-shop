import mongoose from 'mongoose';
import Product from '../models/Product.js';
import InventoryItem from '../models/InventoryItem.js';
import StockMovement from '../models/StockMovement.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { encryptJson } from '../utils/encryption.js';
import { writeAudit } from '../services/auditService.js';
import { checkAndTriggerRestockAlerts } from '../services/restockService.js';
import { paginateWithCursor } from '../utils/cursorPagination.js';
import serverCache from '../utils/cache.js';

export const listInventoryItems = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.productId && mongoose.isValidObjectId(req.query.productId)) filter.product = req.query.productId;
  if (req.query.status && req.query.status.trim()) filter.status = req.query.status.trim();
  if (req.query.itemType && req.query.itemType.trim()) filter.itemType = req.query.itemType.trim();

  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const result = await paginateWithCursor(InventoryItem, filter, {
    limit,
    cursor: req.query.cursor,
    direction: req.query.direction,
    select: '-encryptedPayload',
    populate: { path: 'product', select: 'name slug thumbnail' },
    includeTotal: true,
  });

  return success(res, result);
});

export const createInventoryItem = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.body.productId);
  if (!product) throw new ApiError(404, 'Product not found');
  if (req.body.variantId && !product.variants.id(req.body.variantId)) throw new ApiError(400, 'Product plan not found');
  const item = await InventoryItem.create({
    product: product._id,
    variantId: req.body.variantId || null,
    itemType: req.body.itemType || 'license_key',
    previewLabel: req.body.previewLabel,
    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    encryptedPayload: encryptJson(req.body.payload),
    createdBy: req.user._id,
  });
  await writeAudit(req, 'inventory_credential_created', 'InventoryItem', item._id, { productId: product._id, previewLabel: item.previewLabel });
  checkAndTriggerRestockAlerts(product._id, req.body.variantId).catch(() => {});
  return success(res, { status: 201, message: 'Protected inventory item created', data: { ...item.toObject(), encryptedPayload: undefined } });
});

export const createBulkInventoryItems = asyncHandler(async (req, res) => {
  const { productId, variantId, itemType = 'license_key', lines = [], previewPrefix = '', expiresAt, instructions = '' } = req.body;
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  if (variantId && !product.variants.id(variantId)) throw new ApiError(400, 'Product plan not found');

  const cleanLines = lines.map((l) => String(l).trim()).filter(Boolean);
  if (!cleanLines.length) throw new ApiError(422, 'No valid inventory lines provided');

  const batchId = `BATCH-${Date.now()}`;
  const docs = cleanLines.map((line, index) => {
    let payload;
    let previewLabel = previewPrefix ? `${previewPrefix} #${index + 1}` : line.slice(0, 30);

    if (itemType === 'license_key') {
      payload = { licenseKey: line, instructions };
      previewLabel = previewPrefix ? `${previewPrefix} #${index + 1}` : `Key: ${line.slice(0, 8)}...`;
    } else if (itemType === 'account_credentials') {
      // Check if line is formatted as email:password or email|password
      const parts = line.split(/[:|\t,]/);
      if (parts.length >= 2) {
        payload = { email: parts[0].trim(), password: parts[1].trim(), pin: parts[2]?.trim() || '', instructions };
        previewLabel = parts[0].trim();
      } else {
        payload = { details: line, instructions };
      }
    } else {
      payload = { details: line, instructions };
    }

    return {
      product: product._id,
      variantId: variantId || null,
      itemType,
      batchId,
      previewLabel,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      encryptedPayload: encryptJson(payload),
      createdBy: req.user._id,
      status: 'available',
    };
  });

  const inserted = await InventoryItem.insertMany(docs);
  await writeAudit(req, 'inventory_bulk_created', 'InventoryItem', product._id, {
    count: inserted.length,
    itemType,
    variantId,
  });

  checkAndTriggerRestockAlerts(product._id, variantId).catch(() => {});

  return success(res, {
    status: 201,
    message: `Successfully imported ${inserted.length} digital inventory item(s)`,
    data: { count: inserted.length, batchId },
  });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const rawVariantId = req.body.variantId;
  const variantId = rawVariantId && mongoose.isValidObjectId(rawVariantId) ? rawVariantId : null;
  let variant = null;
  let previousStock;
  let newStock;
  let quantity;

  if (variantId) {
    variant = product.variants.id(variantId);
    if (!variant) throw new ApiError(404, 'Product plan not found');
    previousStock = Number(variant.stock || 0);
  } else {
    previousStock = Number(product.stock || 0);
  }

  if (req.body.mode === 'set') {
    const target = Number(req.body.targetStock !== undefined ? req.body.targetStock : req.body.quantity);
    if (!Number.isInteger(target) || target < 0) {
      throw new ApiError(422, 'Target stock must be a non-negative whole number');
    }
    newStock = target;
    quantity = newStock - previousStock;
  } else {
    quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity === 0) {
      if (req.body.purchasePrice !== undefined && req.body.purchasePrice !== null && req.body.purchasePrice !== '') {
        quantity = 0;
        newStock = previousStock;
      } else {
        throw new ApiError(422, 'Quantity adjustment must be a non-zero whole number');
      }
    } else {
      newStock = previousStock + quantity;
    }
  }

  if (newStock < 0) throw new ApiError(409, 'Stock cannot become negative');

  let effectivePurchasePrice = 0;
  const hasPurchasePrice = req.body.purchasePrice !== undefined && req.body.purchasePrice !== null && req.body.purchasePrice !== '';

  if (variant) {
    variant.stock = newStock;
    if (variant.unlimitedStock && (quantity > 0 || req.body.mode === 'set')) {
      variant.unlimitedStock = false;
    }
    if (hasPurchasePrice) {
      const pPrice = Math.max(0, Number(req.body.purchasePrice));
      variant.purchasePrice = pPrice;
      variant.costPrice = pPrice;
      effectivePurchasePrice = pPrice;
    } else {
      effectivePurchasePrice = Number(variant.purchasePrice || variant.costPrice || 0);
    }
  } else {
    product.stock = newStock;
    if (product.allowUnlimitedStock && (quantity > 0 || req.body.mode === 'set')) {
      product.allowUnlimitedStock = false;
    }
    if (hasPurchasePrice) {
      const pPrice = Math.max(0, Number(req.body.purchasePrice));
      product.purchasePrice = pPrice;
      product.costPrice = pPrice;
      effectivePurchasePrice = pPrice;
    } else {
      effectivePurchasePrice = Number(product.purchasePrice || product.costPrice || 0);
    }
  }

  await product.save();

  let movement = null;
  try {
    if (quantity !== 0 || hasPurchasePrice) {
      movement = await StockMovement.create({
        product: product._id,
        variantId,
        previousStock,
        quantityChanged: quantity,
        newStock,
        purchasePrice: effectivePurchasePrice,
        reason: String(req.body.reason || (quantity >= 0 ? 'Stock addition / restock' : 'Stock adjustment')).slice(0, 300),
        changedBy: req.user?._id || null,
      });
    }
  } catch (mErr) {
    console.error('Failed to record stock movement:', mErr.message);
  }

  try {
    await writeAudit(req, 'inventory_changed', 'Product', product._id, {
      variantId,
      quantity,
      newStock,
      purchasePrice: effectivePurchasePrice,
      reason: req.body.reason,
    });
  } catch (aErr) {
    console.error('Failed to record audit log:', aErr.message);
  }

  if (quantity > 0) {
    checkAndTriggerRestockAlerts(product._id, variantId).catch(() => {});
  }

  try {
    serverCache.invalidateTags(['products', 'home']);
  } catch (cErr) {
    console.error('Cache invalidation error:', cErr.message);
  }

  return success(res, {
    message: 'Stock updated successfully',
    data: {
      movement,
      product: {
        _id: product._id,
        name: product.name,
        stock: product.stock,
        purchasePrice: product.purchasePrice,
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        stockStatus: product.stockStatus,
        variants: product.variants,
      },
    },
  });
});

export const stockHistory = asyncHandler(async (req, res) => {
  const filter = req.query.productId && mongoose.isValidObjectId(req.query.productId) ? { product: req.query.productId } : {};
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const result = await paginateWithCursor(StockMovement, filter, {
    limit,
    cursor: req.query.cursor,
    direction: req.query.direction,
    populate: [
      { path: 'product', select: 'name thumbnail slug' },
      { path: 'changedBy', select: 'name email' },
    ],
    includeTotal: true,
  });
  return success(res, result);
});
