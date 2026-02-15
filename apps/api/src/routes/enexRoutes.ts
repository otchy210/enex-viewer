import { Router } from 'express';

import { enexParseController } from '../controllers/enexParseController.js';
import { parseEnexMultipart } from '../middleware/enexMultipartMiddleware.js';

const router = Router();

router.post('/api/enex/parse', parseEnexMultipart, enexParseController);

export default router;
