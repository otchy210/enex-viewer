import { Router } from 'express';

import { importHashLookupController } from '../controllers/importHashLookupController.js';
import { noteListController } from '../controllers/noteListController.js';
import {
  resourceBulkDownloadController,
  resourceDownloadController
} from '../controllers/resourceDownloadController.js';

const router = Router();

router.post('/api/imports/hash-lookup', importHashLookupController);
router.get('/api/imports/:importId/notes', noteListController);
router.get('/api/imports/:importId/notes/:noteId/resources/:resourceId', resourceDownloadController);
router.post('/api/imports/:importId/resources/bulk-download', resourceBulkDownloadController);

export default router;
