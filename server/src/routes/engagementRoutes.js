import { Router } from 'express';
import { authenticateUser, authenticateOptionalUser } from '../middleware/auth.js';
import {
  wishlist, addWishlist, removeWishlist, productReviews, canReviewProduct, saveReview, deleteReview,
  addRecentlyViewed, recentlyViewed, recommendations, createTicket, myTickets, myTicket, replyTicket,
  notifications, readNotification, readAllNotifications, subscriptions, toggleAutoRenew, wallet, referral,
  createRefund, myRefunds, mySessions, revokeSession, activity, chatbotContext,
} from '../controllers/engagementController.js';
import {
  listPublicPackages,
  createCreditPurchase,
  myCreditPurchases,
  myCreditPurchase,
  myWalletTransactions,
} from '../controllers/walletCreditController.js';
import { validateBody } from '../middleware/validate.js';
import { walletCreditPurchaseCreateSchema } from '../validations/schemas.js';

const router = Router();

router.get('/reviews/product/:productId', productReviews);
router.get('/wallet/packages', listPublicPackages);
router.get('/recommendations', authenticateOptionalUser, recommendations);

router.use(authenticateUser);
router.get('/wishlist', wishlist);
router.post('/wishlist/:productId', addWishlist);
router.remove = router.delete;
router.delete('/wishlist/:productId', removeWishlist);
router.get('/reviews/can-review/:productId', canReviewProduct);
router.post('/reviews', saveReview);
router.delete('/reviews/:id', deleteReview);
router.post('/recently-viewed/:productId', addRecentlyViewed);
router.get('/recently-viewed', recentlyViewed);
router.post('/support-tickets', createTicket);
router.get('/support-tickets', myTickets);
router.get('/support-tickets/:id', myTicket);
router.post('/support-tickets/:id/replies', replyTicket);
router.get('/notifications', notifications);
router.patch('/notifications/read-all', readAllNotifications);
router.patch('/notifications/:id/read', readNotification);
router.get('/subscriptions', subscriptions);
router.patch('/subscriptions/:id/auto-renew', toggleAutoRenew);
router.get('/wallet', wallet);
router.get('/wallet/transactions', myWalletTransactions);
router.post('/wallet/purchases', validateBody(walletCreditPurchaseCreateSchema), createCreditPurchase);
router.get('/wallet/purchases', myCreditPurchases);
router.get('/wallet/purchases/:id', myCreditPurchase);
router.get('/referral', referral);
router.post('/refunds', createRefund);
router.get('/refunds', myRefunds);
router.get('/sessions', mySessions);
router.delete('/sessions/:id', revokeSession);
router.get('/activity', activity);
router.get('/chatbot-context', chatbotContext);
export default router;
