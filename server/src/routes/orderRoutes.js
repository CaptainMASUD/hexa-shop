import { Router } from 'express';
import { createOrder, myOrders, myOrder, cancelMyOrder } from '../controllers/orderController.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createOrderSchema } from '../validations/schemas.js';
import { orderCheckoutLimiter } from '../middleware/rateLimiters.js';
import { checkFraudBlock } from '../middleware/fraudDetection.js';
import { verifyBotProtection } from '../middleware/botShield.js';

const router = Router();
router.use(authenticateUser);
router.post('/', orderCheckoutLimiter, checkFraudBlock, verifyBotProtection, validateBody(createOrderSchema), createOrder);
router.get('/', myOrders);
router.patch('/:id/cancel', cancelMyOrder);
router.get('/:id', myOrder);
export default router;
