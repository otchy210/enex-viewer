import express, { Router } from 'express';

import { enexParseController } from '../controllers/enexParseController.js';
import { parseEnexMultipart } from '../middleware/enexMultipartMiddleware.js';

const router = Router();
const maxFileSizeBytes = 10 * 1024 * 1024;

router.post(
  '/api/enex/parse',
  express.raw({ type: 'multipart/form-data', limit: maxFileSizeBytes }),
  (req, res, next) => {
    // eslint-disable-next-line promise/prefer-await-to-then
    void parseEnexMultipart(req, res, next).catch(next);
  },
  (req, res, next) => {
    enexParseController(req, res, next);
  }
);

router.use(
  (error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error !== null && typeof error === 'object' && 'type' in error) {
      const typedError = error as { type?: string };
      if (typedError.type === 'entity.too.large') {
        return res.status(413).json({
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the allowed limit.'
        });
      }
    }

    next(error);
  }
);

export default router;
