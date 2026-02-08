import { Router } from 'express';

import healthRoutes from './healthRoutes.js';
import messageRoutes from './messageRoutes.js';

const router = Router();

router.use(healthRoutes);
router.use(messageRoutes);

export default router;
