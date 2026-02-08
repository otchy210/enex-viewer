import { Router } from 'express';

import { noteDetailController } from '../controllers/noteDetailController.js';

const router = Router();

router.get('/api/imports/:importId/notes/:noteId', noteDetailController);

export default router;
