import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { couponValidateSchema, checkoutQuoteSchema, affiliatePayoutSchema } from '../validations/schemas.js';
import { affiliatePayoutLimiter } from '../middleware/rateLimiters.js';
import {
  bundles, bundle, promotions, publicSettings, validateCoupon, invoice, checkoutQuote,
  listMyPayouts, requestAffiliatePayout,
} from '../controllers/commerceFeatureController.js';

const router = Router();
router.get('/bundles', bundles);
router.get('/bundles/:slug', bundle);
router.get('/promotions', promotions);
router.get('/settings', publicSettings);
router.post('/coupons/validate', authenticateUser, validateBody(couponValidateSchema), validateCoupon);
router.post('/quote', authenticateUser, validateBody(checkoutQuoteSchema), checkoutQuote);
router.get('/invoice/:orderId', authenticateUser, invoice);
router.get('/affiliate/payouts', authenticateUser, listMyPayouts);
router.post('/affiliate/payouts', authenticateUser, affiliatePayoutLimiter, validateBody(affiliatePayoutSchema), requestAffiliatePayout);

export default router;
