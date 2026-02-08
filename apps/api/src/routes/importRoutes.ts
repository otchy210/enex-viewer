import { Router } from 'express';

import { noteListController } from '../controllers/noteListController.js';

const router = Router();

router.get('/api/imports/:importId/notes', noteListController);

export default router;
