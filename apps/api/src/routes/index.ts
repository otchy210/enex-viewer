import { Router } from 'express';

import enexRoutes from './enexRoutes.js';
import healthRoutes from './healthRoutes.js';
import importRoutes from './importRoutes.js';
import messageRoutes from './messageRoutes.js';
import noteRoutes from './noteRoutes.js';

const router = Router();

router.use(healthRoutes);
router.use(enexRoutes);
router.use(messageRoutes);
router.use(importRoutes);
router.use(noteRoutes);

export default router;
