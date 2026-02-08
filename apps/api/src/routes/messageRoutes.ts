import { Router } from 'express';

import { messageController } from '../controllers/messageController.js';

const router = Router();

router.get('/api/message', messageController);

export default router;
