import { Router } from 'express';

import healthRoutes from './healthRoutes.js';
import enexRoutes from './enexRoutes.js';
import messageRoutes from './messageRoutes.js';

const router = Router();

router.use(healthRoutes);
router.use(enexRoutes);
router.use(messageRoutes);

export default router;
