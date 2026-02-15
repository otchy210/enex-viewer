import { Router } from 'express';

import { importHashLookupController } from '../controllers/importHashLookupController.js';
import { noteListController } from '../controllers/noteListController.js';

const router = Router();

router.post('/api/imports/hash-lookup', importHashLookupController);
router.get('/api/imports/:importId/notes', noteListController);

export default router;
