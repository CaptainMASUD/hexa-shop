import { Router } from 'express';
import { listProducts, getProduct, suggestions } from '../controllers/productController.js';
import { validateQuery } from '../middleware/validate.js';
import { productQuerySchema } from '../validations/schemas.js';
const router = Router();
router.get('/suggestions', suggestions);
router.get('/', validateQuery(productQuerySchema), listProducts);
router.get('/:slugOrId', getProduct);
export default router;
