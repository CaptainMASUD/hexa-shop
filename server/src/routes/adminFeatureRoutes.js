import { Router } from 'express';
import { authenticateUser, authorizeRoles, authorizePermissions } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  bundleCreateSchema, bundleUpdateSchema,
  couponCreateSchema, couponUpdateSchema,
  promotionCreateSchema, promotionUpdateSchema,
  adminAffiliatePayoutSchema, fraudBlockSchema,
} from '../validations/schemas.js';
import {
  couponCrud,bundleCrud,promotionCrud,roleCrud,adminReviews,moderateReview,adminTickets,adminTicket,adminReplyTicket,adminTicketStatus,
  adminRefunds,resolveRefund,adminNotifications,createNotification,abandonedCarts,assignRole,adjustWallet,siteSettings,updateSiteSettings,backupExport,backupRestore,growthAnalytics,
  adminPayouts,processPayout,listFraudBlocks,createFraudBlock,removeFraudBlock,toggleFraudBlock,
} from '../controllers/adminFeatureController.js';

const router=Router();
router.use(authenticateUser,authorizeRoles('admin'));
const permit=(p)=>authorizePermissions(p);

const growth=permit('growth.manage');
router.get('/coupons',growth,couponCrud.list);
router.get('/coupons/:id',growth,couponCrud.get);
router.post('/coupons',growth,validateBody(couponCreateSchema),couponCrud.create);
router.put('/coupons/:id',growth,validateBody(couponUpdateSchema),couponCrud.update);
router.patch('/coupons/:id',growth,validateBody(couponUpdateSchema),couponCrud.update);
router.delete('/coupons/:id',growth,couponCrud.remove);

router.get('/bundles',growth,bundleCrud.list);
router.get('/bundles/:id',growth,bundleCrud.get);
router.post('/bundles',growth,validateBody(bundleCreateSchema),bundleCrud.create);
router.put('/bundles/:id',growth,validateBody(bundleUpdateSchema),bundleCrud.update);
router.patch('/bundles/:id',growth,validateBody(bundleUpdateSchema),bundleCrud.update);
router.delete('/bundles/:id',growth,bundleCrud.remove);

router.get('/promotions',growth,promotionCrud.list);
router.get('/promotions/:id',growth,promotionCrud.get);
router.post('/promotions',growth,validateBody(promotionCreateSchema),promotionCrud.create);
router.put('/promotions/:id',growth,validateBody(promotionUpdateSchema),promotionCrud.update);
router.patch('/promotions/:id',growth,validateBody(promotionUpdateSchema),promotionCrud.update);
router.delete('/promotions/:id',growth,promotionCrud.remove);

const rolePermit=permit('roles.manage');
router.get('/roles',rolePermit,roleCrud.list);
router.get('/roles/:id',rolePermit,roleCrud.get);
router.post('/roles',rolePermit,roleCrud.create);
router.put('/roles/:id',rolePermit,roleCrud.update);
router.patch('/roles/:id',rolePermit,roleCrud.update);
router.delete('/roles/:id',rolePermit,roleCrud.remove);

router.get('/reviews',permit('reviews.manage'),adminReviews);router.patch('/reviews/:id',permit('reviews.manage'),moderateReview);
router.get('/support-tickets',permit('support.manage'),adminTickets);router.get('/support-tickets/:id',permit('support.manage'),adminTicket);router.post('/support-tickets/:id/replies',permit('support.manage'),adminReplyTicket);router.patch('/support-tickets/:id/status',permit('support.manage'),adminTicketStatus);
router.get('/refunds',permit('refunds.manage'),adminRefunds);router.patch('/refunds/:id',permit('refunds.manage'),resolveRefund);
router.get('/notifications',permit('growth.manage'),adminNotifications);router.post('/notifications',permit('growth.manage'),createNotification);
router.get('/abandoned-carts',permit('growth.manage'),abandonedCarts);
router.patch('/users/:userId/role',permit('roles.manage'),assignRole);router.post('/users/:userId/wallet',permit('users.manage'),adjustWallet);
router.get('/settings',permit('settings.manage'),siteSettings);router.put('/settings',permit('settings.manage'),updateSiteSettings);
router.get('/backup/export',permit('backup.manage'),backupExport);router.post('/backup/restore',permit('backup.manage'),backupRestore);router.get('/growth-analytics',permit('reports.view'),growthAnalytics);

router.get('/affiliate/payouts', permit('growth.manage'), adminPayouts);
router.patch('/affiliate/payouts/:id', permit('growth.manage'), validateBody(adminAffiliatePayoutSchema), processPayout);

router.get('/fraud-blocks', permit('settings.manage'), listFraudBlocks);
router.post('/fraud-blocks', permit('settings.manage'), validateBody(fraudBlockSchema), createFraudBlock);
router.delete('/fraud-blocks/:id', permit('settings.manage'), removeFraudBlock);
router.patch('/fraud-blocks/:id/toggle', permit('settings.manage'), toggleFraudBlock);
export default router;
