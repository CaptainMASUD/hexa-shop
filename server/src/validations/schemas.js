import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const email = z.string().trim().email().max(160).transform((value) => value.toLowerCase());
const strongPassword = z.string().min(8).max(128).regex(/[a-z]/, 'Password needs a lowercase letter').regex(/[A-Z]/, 'Password needs an uppercase letter').regex(/\d/, 'Password needs a number');
const image = z.object({ url: z.string().url(), publicId: z.string().optional().default(''), alt: z.string().max(160).optional().default('') });
const optionalImage = z.object({ url: z.string().url().or(z.literal('')).optional().default(''), publicId: z.string().optional().default(''), alt: z.string().max(160).optional().default('') });
const dateTimeOrNull = z.string().datetime().nullable().optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: strongPassword,
  phone: z.string().trim().max(30).optional().default(''),
  referralCode: z.string().trim().max(40).optional().default(''),
});
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const adminRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, dashes, and underscores').transform((v) => v.toLowerCase()),
  email: z.string().trim().email().max(160).transform((v) => v.toLowerCase()).optional().or(z.literal('')).default(''),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  registerCode: z.string().trim().min(1, 'Admin registration code is required'),
});
export const adminLoginSchema = z.object({
  username: z.string().trim().min(2, 'Username is required').max(160),
  password: z.string().min(1, 'Password is required').max(128),
});
export const twoFactorSchema = z.object({ otp: z.string().regex(/^\d{6}$/, 'Enter a 6-digit authenticator code') });
export const profileSchema = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(30).optional().default('') });
export const passwordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: strongPassword });

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(100).optional().default(''),
  description: z.string().max(500).optional().default(''),
  image: optionalImage.optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  status: z.enum(['active', 'inactive', 'archived']).optional().default('active'),
});

const customField = z.object({
  name: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(100),
  type: z.enum(['text', 'number', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'toggle', 'date']).optional().default('text'),
  placeholder: z.string().trim().max(160).optional().default(''),
  helpText: z.string().trim().max(300).optional().default(''),
  required: z.coerce.boolean().optional().default(true),
  defaultValue: z.any().optional().default(''),
  options: z.array(z.string().trim().max(100)).optional().default([]),
  validation: z.object({
    minLength: z.coerce.number().min(0).optional(),
    maxLength: z.coerce.number().min(0).optional(),
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
    regex: z.string().max(300).optional().default(''),
    customErrorMessage: z.string().max(200).optional().default(''),
  }).optional().default({}),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
});

const variant = z.object({
  id: objectId.optional(),
  _id: objectId.optional(),
  name: z.string().trim().min(1).max(100),
  duration: z.string().max(80).optional().default(''),
  sku: z.string().trim().max(80).optional().default(''),
  region: z.string().trim().max(80).optional().default(''),
  platform: z.string().trim().max(80).optional().default(''),
  regularPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0).optional().default(0),
  costPrice: z.coerce.number().min(0).optional().default(0),
  stock: z.coerce.number().int().min(0).optional().default(0),
  unlimitedStock: z.coerce.boolean().optional().default(false),
  reservedQuantity: z.coerce.number().int().min(0).optional().default(0),
  soldQuantity: z.coerce.number().int().min(0).optional().default(0),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  active: z.coerce.boolean().optional().default(true),
  metadata: z.record(z.any()).optional().default({}),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional().default(''),
  brand: z.string().trim().max(100).optional().default(''),
  shortDescription: z.string().max(300).optional().default(''),
  description: z.string().max(6000).optional().default(''),
  category: objectId,
  subcategory: z.string().max(100).optional().default(''),
  regularPrice: z.coerce.number().min(0).optional().default(0),
  salePrice: z.coerce.number().min(0).optional().default(0),
  currency: z.string().min(3).max(5).optional().default('BDT'),
  stock: z.coerce.number().int().min(0).optional().default(0),
  allowUnlimitedStock: z.coerce.boolean().optional().default(false),
  lowStockThreshold: z.coerce.number().int().min(0).optional().default(5),
  thumbnail: image.optional(),
  galleryImages: z.array(image).max(8).optional().default([]),
  bannerImage: image.optional(),
  seo: z.object({ title: z.string().trim().max(180).optional().default(''), description: z.string().trim().max(320).optional().default(''), keywords: z.array(z.string().trim().max(80)).max(30).optional().default([]) }).optional().default({}),
  featured: z.coerce.boolean().optional().default(false),
  popular: z.coerce.boolean().optional().default(false),
  newArrival: z.coerce.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  status: z.enum(['active', 'inactive', 'archived']).optional().default('active'),
  deliveryType: z.enum(['manual', 'instant', 'scheduled']).optional().default('manual'),
  fulfillmentType: z.enum(['manual', 'license_key', 'account_credentials', 'api_topup', 'email_delivery', 'auto_delivery', 'custom']).optional().default('manual'),
  fulfillmentConfig: z.object({
    provider: z.string().trim().max(100).optional().default(''),
    serviceCode: z.string().trim().max(100).optional().default(''),
    autoDeliverKey: z.coerce.boolean().optional().default(false),
    customInstructions: z.string().max(2000).optional().default(''),
    extra: z.record(z.any()).optional().default({}),
  }).optional().default({}),
  productType: z.enum([
    'subscription',
    'game',
    'game_topup',
    'game_license',
    'software',
    'software_license',
    'gift_card',
    'account',
    'digital_account',
    'license',
    'digital-product',
    'tool',
    'other',
  ]).optional().default('digital-product'),
  tags: z.array(z.string().trim().max(50)).max(30).optional().default([]),
  searchKeywords: z.array(z.string().trim().max(80)).max(30).optional().default([]),
  details: z.record(z.any()).optional().default({}),
  customFields: z.array(customField).max(50).optional().default([]),
  variants: z.array(variant).max(100).optional().default([]),
});

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  type: z.string().trim().max(50).optional(),
  productType: z.string().trim().max(50).optional(),
  brand: z.string().trim().max(100).optional(),
  region: z.string().trim().max(80).optional(),
  platform: z.string().trim().max(80).optional(),
  availability: z.enum(['in_stock', 'out_of_stock', 'all']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  popular: z.enum(['true', 'false']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'popular', 'price_asc', 'price_desc', 'discount']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(12),
  admin: z.enum(['true', 'false']).optional(),
});

const cartItemInput = z.object({
  itemType: z.enum(['product', 'bundle']).optional(),
  productId: objectId.nullable().optional(),
  bundleId: objectId.nullable().optional(),
  variantId: objectId.nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(20),
  customerInputs: z.record(z.any()).optional().default({}),
}).superRefine((item, ctx) => {
  const type = item.itemType || (item.bundleId ? 'bundle' : 'product');
  if (type === 'bundle') {
    if (!item.bundleId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundleId'], message: 'Bundle is required' });
    if (item.productId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productId'], message: 'Bundle item cannot also contain productId' });
  } else {
    if (!item.productId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productId'], message: 'Product is required' });
    if (item.bundleId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bundleId'], message: 'Product item cannot also contain bundleId' });
  }
});

export const cartSchema = z.object({ items: z.array(cartItemInput).max(50) });

export const createOrderSchema = z.object({
  items: z.array(cartItemInput).min(1).max(50),
  customer: z.object({ name: z.string().trim().min(2).max(100), email, phone: z.string().trim().min(5).max(30) }),
  paymentMethodId: objectId,
  senderNumber: z.string().trim().min(5).max(30),
  transactionId: z.string().trim().min(4).max(120),
  couponCode: z.string().trim().max(40).optional().default(''),
  // Legacy single-bundle checkout is accepted and collapsed to one order line.
  bundleId: objectId.nullable().optional(),
  walletAmount: z.coerce.number().min(0).optional().default(0),
  loyaltyPoints: z.coerce.number().int().min(0).optional().default(0),
});

export const checkoutQuoteSchema = z.object({
  items: z.array(cartItemInput).min(1).max(50),
  customer: z.object({ name: z.string().trim().min(2).max(100), email, phone: z.string().trim().min(5).max(30) }).optional(),
  paymentMethodId: objectId,
  couponCode: z.string().trim().max(40).optional().default(''),
  bundleId: objectId.nullable().optional(),
  walletAmount: z.coerce.number().min(0).optional().default(0),
  loyaltyPoints: z.coerce.number().int().min(0).optional().default(0),
});

export const couponValidateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  items: z.array(cartItemInput).min(1).max(50).optional(),
  subtotal: z.coerce.number().min(0).optional(),
  bundleId: objectId.nullable().optional(),
}).superRefine((value, ctx) => {
  if (!value.items?.length && value.subtotal === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Cart items are required (or subtotal for unrestricted legacy coupons)' });
});

const bundleItemInput = z.object({
  product: objectId.optional(),
  productId: objectId.optional(),
  variantId: objectId.nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(20).optional().default(1),
}).superRefine((item, ctx) => {
  if (!item.product && !item.productId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['product'], message: 'Product is required' });
});

const bundleBaseSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  code: z.string().trim().max(80).optional(),
  shortDescription: z.string().max(300).optional(),
  description: z.string().max(3000).optional(),
  image: image.optional(),
  bannerImage: image.optional(),
  items: z.array(bundleItemInput).min(2).max(50),
  regularPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0).optional(),
  currency: z.string().min(3).max(5).optional(),
  featured: z.coerce.boolean().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  startsAt: dateTimeOrNull,
  endsAt: dateTimeOrNull,
  tags: z.array(z.string().trim().max(50)).max(30).optional(),
});

const validateBundlePayload = (value, ctx) => {
  if (Number(value.salePrice || 0) > 0 && value.regularPrice !== undefined && Number(value.salePrice) >= Number(value.regularPrice)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['salePrice'], message: 'Sale price must be lower than regular price' });
  }
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End date must be after start date' });
  }
  if (value.items) {
    const seen = new Set();
    value.items.forEach((item, index) => {
      const key = `${item.product || item.productId || ''}:${item.variantId || ''}`;
      if (seen.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index], message: 'Duplicate product/plan in bundle' });
      seen.add(key);
    });
  }
};

export const bundleCreateSchema = bundleBaseSchema.superRefine(validateBundlePayload);
export const bundleUpdateSchema = bundleBaseSchema.partial().superRefine(validateBundlePayload);

const couponBaseSchema = z.object({
  code: z.string().trim().min(2).max(40),
  description: z.string().max(300).optional(),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().min(0),
  minOrder: z.coerce.number().min(0).optional(),
  maxDiscount: z.coerce.number().min(0).optional(),
  usageLimit: z.coerce.number().int().min(0).optional(),
  perUserLimit: z.coerce.number().int().min(1).optional(),
  allowedCategories: z.array(objectId).max(200).optional(),
  allowedProducts: z.array(objectId).max(200).optional(),
  allowedBundles: z.array(objectId).max(200).optional(),
  startsAt: dateTimeOrNull,
  endsAt: dateTimeOrNull,
  active: z.coerce.boolean().optional(),
});
const validateCouponPayload = (value, ctx) => {
  if (value.type === 'percent' && Number(value.value) > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Percentage cannot exceed 100' });
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End date must be after start date' });
};
export const couponCreateSchema = couponBaseSchema.superRefine(validateCouponPayload);
export const couponUpdateSchema = couponBaseSchema.partial().superRefine(validateCouponPayload);

const promotionBaseSchema = z.object({
  name: z.string().trim().min(2).max(160),
  headline: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  badge: z.string().max(100).optional(),
  image: optionalImage.optional(),
  discountType: z.enum(['percent', 'fixed', 'display_only']),
  discountValue: z.coerce.number().min(0).optional(),
  scope: z.enum(['targeted', 'all']).optional(),
  products: z.array(objectId).max(200).optional(),
  categories: z.array(objectId).max(200).optional(),
  bundles: z.array(objectId).max(200).optional(),
  bundle: objectId.nullable().optional(),
  buttonText: z.string().max(100).optional(),
  buttonLink: z.string().max(500).optional(),
  startsAt: dateTimeOrNull,
  endsAt: dateTimeOrNull,
  active: z.coerce.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
const validatePromotionPayload = (value, ctx) => {
  if (value.discountType === 'percent' && Number(value.discountValue || 0) > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Percentage cannot exceed 100' });
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End date must be after start date' });
  if (value.discountType && value.discountType !== 'display_only' && value.scope !== 'all') {
    const targetCount = (value.products?.length || 0) + (value.categories?.length || 0) + (value.bundles?.length || 0) + (value.bundle ? 1 : 0);
    if (targetCount === 0 && (value.products || value.categories || value.bundles || value.bundle !== undefined || value.scope === 'targeted')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scope'], message: 'Targeted promotion needs a product, category, or bundle' });
    }
  }
};
export const promotionCreateSchema = promotionBaseSchema.superRefine(validatePromotionPayload);
export const promotionUpdateSchema = promotionBaseSchema.partial().superRefine(validatePromotionPayload);

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(100).optional().default(''),
  logo: optionalImage.optional(),
  qrCode: optionalImage.optional(),
  gatewayType: z.enum(['manual', 'external', 'wallet']).optional().default('manual'),
  accountNumber: z.string().trim().max(100).optional().default(''),
  accountType: z.string().trim().max(100).optional().default(''),
  accountName: z.string().trim().max(120).optional().default(''),
  branchName: z.string().trim().max(120).optional().default(''),
  chargeNote: z.string().trim().max(200).optional().default(''),
  instructions: z.string().trim().max(5000).optional().default(''),
  publicConfig: z.record(z.any()).optional().default({}),
  active: z.coerce.boolean().optional().default(true),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
}).superRefine((value, ctx) => {
  if (value.gatewayType === 'manual' && value.accountNumber.length < 3) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountNumber'], message: 'Manual payment account number is required' });
  if (value.gatewayType === 'manual' && value.instructions.length < 3) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['instructions'], message: 'Manual payment instructions are required' });
});

export const bannerSchema = z.object({
  title: z.string().trim().min(2).max(140), subtitle: z.string().max(300).optional().default(''),
  image, buttonText: z.string().max(80).optional().default('Shop now'), buttonLink: z.string().max(300).optional().default('/products'),
  displayOrder: z.coerce.number().int().min(0).optional().default(0), active: z.coerce.boolean().optional().default(true),
  badge: z.string().max(80).optional().default(''), placement: z.enum(['hero','category','product','bundle','offer','midpage']).optional().default('hero'),
  targetType: z.enum(['none','category','product','bundle','url']).optional().default('none'), targetId: objectId.nullable().optional(),
  startDate: z.string().datetime().nullable().optional(), endDate: z.string().datetime().nullable().optional(),
});

export const inventoryItemSchema = z.object({
  productId: objectId,
  variantId: objectId.nullable().optional(),
  itemType: z.enum(['license_key', 'account_credentials', 'custom']).optional().default('license_key'),
  previewLabel: z.string().max(120).optional().default(''),
  expiresAt: z.string().datetime().nullable().optional(),
  payload: z.record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.any()), z.record(z.any())])).refine((value) => Object.keys(value).length > 0, 'Credential payload is required'),
});

export const bulkInventoryItemSchema = z.object({
  productId: objectId,
  variantId: objectId.nullable().optional(),
  itemType: z.enum(['license_key', 'account_credentials', 'custom']).optional().default('license_key'),
  lines: z.array(z.string().trim().min(1)).min(1).max(500),
  previewPrefix: z.string().max(80).optional().default(''),
  expiresAt: z.string().datetime().nullable().optional(),
  instructions: z.string().max(2000).optional().default(''),
});

export const deliverySchema = z.object({
  orderItemId: objectId,
  inventoryItemId: objectId.nullable().optional(),
  inventoryItemIds: z.array(objectId).max(100).optional().default([]),
  summary: z.string().max(180).optional().default('Digital delivery'),
  markDelivered: z.coerce.boolean().optional().default(false),
  details: z.record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.any()), z.record(z.any())])).optional(),
}).refine((value) => value.inventoryItemId || value.inventoryItemIds.length || (value.details && Object.keys(value.details).length), { message: 'Provide inventory item(s) or delivery details' });

export const orderStatusSchema = z.object({ status: z.enum(['confirmed', 'processing', 'delivered', 'rejected', 'cancelled', 'refunded']), note: z.string().max(500).optional().default('') });
export const paymentStatusSchema = z.object({ status: z.enum(['verified', 'rejected', 'refunded']), note: z.string().max(500).optional().default('') });
export const internalNoteSchema = z.object({ note: z.string().max(3000) });
