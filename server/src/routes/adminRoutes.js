import { Router } from 'express';
import { authenticateUser, authorizeRoles, authorizePermissions } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { uploadImage } from '../middleware/upload.js';
import {
  productSchema, productQuerySchema, categorySchema, paymentMethodSchema, bannerSchema,
  inventoryItemSchema, bulkInventoryItemSchema, deliverySchema, orderStatusSchema,
  paymentStatusSchema, internalNoteSchema, walletCreditPackageSchema,
  adminApproveCreditPurchaseSchema, adminRejectCreditPurchaseSchema,
  adminCreateSchema, adminUpdateSchema,
} from '../validations/schemas.js';
import { listAdminProducts, getAdminProduct, createProduct, updateProduct, deleteProduct, archiveProduct } from '../controllers/productController.js';
import { listAdminCategories, createCategory, updateCategory, archiveCategory } from '../controllers/categoryController.js';
import { listAdminPaymentMethods, createPaymentMethod, updatePaymentMethod, archivePaymentMethod } from '../controllers/paymentMethodController.js';
import { listAdminBanners, createBanner, updateBanner, archiveBanner } from '../controllers/bannerController.js';
import { listInventoryItems, createInventoryItem, createBulkInventoryItems, adjustStock, stockHistory } from '../controllers/inventoryController.js';
import { adminOrders, adminOrder, updatePaymentStatus, updateOrderStatus, updateInternalNote, deliverOrderItem } from '../controllers/orderController.js';
import { listUsers, getUser, updateUserStatus } from '../controllers/userController.js';
import { listAdmins, getAdmin, createAdmin, updateAdmin, deleteAdmin } from '../controllers/adminManagementController.js';
import { dashboard, salesReport, productReport, categoryReport } from '../controllers/reportController.js';
import { listAuditLogs } from '../controllers/auditController.js';
import { uploadAdminImage } from '../controllers/uploadController.js';
import {
  adminCreditPurchases,
  adminCreditPurchase,
  approveCreditPurchase,
  rejectCreditPurchase,
  adminListPackages,
  adminCreatePackage,
  adminUpdatePackage,
  adminDeletePackage,
  adminUserWalletDetail,
  adminWalletTransactions,
} from '../controllers/walletCreditController.js';

const router = Router();
router.use(authenticateUser, authorizeRoles('admin'));
const catalog = authorizePermissions('catalog.manage'),
  inventory = authorizePermissions('inventory.manage'),
  orders = authorizePermissions('orders.manage'),
  users = authorizePermissions('users.manage'),
  reports = authorizePermissions('reports.view'),
  settings = authorizePermissions('settings.manage'),
  audit = authorizePermissions('audit.view');

router.get('/dashboard', reports, dashboard);
router.post('/uploads/image', catalog, uploadImage.single('image'), uploadAdminImage);
router.get('/products', catalog, validateQuery(productQuerySchema), listAdminProducts);
router.get('/products/:id', catalog, getAdminProduct);
router.post('/products', catalog, validateBody(productSchema), createProduct);
router.put('/products/:id', catalog, validateBody(productSchema), updateProduct);
router.delete('/products/:id', catalog, deleteProduct);
router.get('/categories', catalog, listAdminCategories);
router.post('/categories', catalog, validateBody(categorySchema), createCategory);
router.put('/categories/:id', catalog, validateBody(categorySchema), updateCategory);
router.delete('/categories/:id', catalog, archiveCategory);
router.get('/payment-methods', settings, listAdminPaymentMethods);
router.post('/payment-methods', settings, validateBody(paymentMethodSchema), createPaymentMethod);
router.put('/payment-methods/:id', settings, validateBody(paymentMethodSchema), updatePaymentMethod);
router.delete('/payment-methods/:id', settings, archivePaymentMethod);
router.get('/banners', settings, listAdminBanners);
router.post('/banners', settings, validateBody(bannerSchema), createBanner);
router.put('/banners/:id', settings, validateBody(bannerSchema), updateBanner);
router.delete('/banners/:id', settings, archiveBanner);
router.get('/inventory/items', inventory, listInventoryItems);
router.post('/inventory/items', inventory, validateBody(inventoryItemSchema), createInventoryItem);
router.post('/inventory/items/bulk', inventory, validateBody(bulkInventoryItemSchema), createBulkInventoryItems);
router.post('/inventory/stock/:productId', inventory, adjustStock);
router.get('/inventory/history', inventory, stockHistory);
router.get('/orders', orders, adminOrders);
router.get('/orders/:id', orders, adminOrder);
router.patch('/orders/:id/payment', orders, validateBody(paymentStatusSchema), updatePaymentStatus);
router.patch('/orders/:id/status', orders, validateBody(orderStatusSchema), updateOrderStatus);
router.patch('/orders/:id/note', orders, validateBody(internalNoteSchema), updateInternalNote);
router.post('/orders/:id/delivery', orders, validateBody(deliverySchema), deliverOrderItem);
router.get('/users', users, listUsers);
router.get('/users/:id', users, getUser);
router.patch('/users/:id/status', users, updateUserStatus);
router.get('/admins', users, listAdmins);
router.get('/admins/:id', users, getAdmin);
router.post('/admins', users, validateBody(adminCreateSchema), createAdmin);
router.put('/admins/:id', users, validateBody(adminUpdateSchema), updateAdmin);
router.delete('/admins/:id', users, deleteAdmin);
router.get('/reports/sales', reports, salesReport);
router.get('/reports/products', reports, productReport);
router.get('/reports/categories', reports, categoryReport);
router.get('/audit-logs', audit, listAuditLogs);

// Admin Wallet & Credit Purchase Routes
router.get('/wallet/purchases', users, adminCreditPurchases);
router.get('/wallet/purchases/:id', users, adminCreditPurchase);
router.patch('/wallet/purchases/:id/approve', users, validateBody(adminApproveCreditPurchaseSchema.optional()), approveCreditPurchase);
router.patch('/wallet/purchases/:id/reject', users, validateBody(adminRejectCreditPurchaseSchema), rejectCreditPurchase);
router.get('/wallet/packages', users, adminListPackages);
router.post('/wallet/packages', users, validateBody(walletCreditPackageSchema), adminCreatePackage);
router.put('/wallet/packages/:id', users, validateBody(walletCreditPackageSchema), adminUpdatePackage);
router.delete('/wallet/packages/:id', users, adminDeletePackage);
router.get('/wallet/users/:userId', users, adminUserWalletDetail);
router.get('/wallet/transactions', users, adminWalletTransactions);

export default router;
