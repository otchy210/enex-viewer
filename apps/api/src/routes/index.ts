import { Router } from 'express';

import enexRoutes from './enexRoutes.js';
import healthRoutes from './healthRoutes.js';
import importRoutes from './importRoutes.js';
import noteRoutes from './noteRoutes.js';

const router = Router();

router.use(healthRoutes);
router.use(enexRoutes);
router.use(importRoutes);
router.use(noteRoutes);

export default router;
