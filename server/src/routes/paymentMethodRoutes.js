import { Router } from 'express';
import { listPaymentMethods } from '../controllers/paymentMethodController.js';
const router = Router();
router.get('/', listPaymentMethods);
export default router;
