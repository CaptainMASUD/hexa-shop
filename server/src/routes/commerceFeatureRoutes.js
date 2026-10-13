import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { couponValidateSchema, checkoutQuoteSchema, affiliatePayoutSchema } from '../validations/schemas.js';
import { affiliatePayoutLimiter } from '../middleware/rateLimiters.js';
import { checkFraudBlock } from '../middleware/fraudDetection.js';
import publicCacheControl from '../middleware/cacheHeaders.js';
import {
  homeData, bundles, bundle, promotions, publicSettings, validateCoupon, invoice, checkoutQuote,
  listMyPayouts, requestAffiliatePayout,
} from '../controllers/commerceFeatureController.js';

const router = Router();
router.get('/home', publicCacheControl(60, 300), homeData);
router.get('/bundles', publicCacheControl(60, 300), bundles);
router.get('/bundles/:slug', publicCacheControl(60, 300), bundle);
router.get('/promotions', publicCacheControl(60, 300), promotions);
router.get('/settings', publicCacheControl(120, 600), publicSettings);
router.post('/coupons/validate', authenticateUser, validateBody(couponValidateSchema), validateCoupon);
router.post('/quote', authenticateUser, validateBody(checkoutQuoteSchema), checkoutQuote);
router.get('/invoice/:orderId', authenticateUser, invoice);
router.get('/affiliate/payouts', authenticateUser, listMyPayouts);
router.post('/affiliate/payouts', authenticateUser, affiliatePayoutLimiter, checkFraudBlock, validateBody(affiliatePayoutSchema), requestAffiliatePayout);

export default router;
