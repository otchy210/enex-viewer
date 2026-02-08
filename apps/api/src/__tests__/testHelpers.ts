import cors from 'cors';
import express from 'express';
import request from 'supertest';

import routes from '../routes/index.js';

type UploadOptions = {
  filename?: string;
  contentType?: string;
};

export const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(routes);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    if (res.headersSent) {
      return;
    }

    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected error.'
    });
  });

  return app;
};

export const buildEnexPayload = (notesXml: string): Buffer =>
  Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><en-export>${notesXml}</en-export>`);

export const uploadEnex = (
  app: express.Express,
  payload: Buffer,
  options: UploadOptions = {}
) => {
  const { filename = 'sample.enex', contentType = 'application/xml' } = options;
  return request(app)
    .post('/api/enex/parse')
    .attach('file', payload, { filename, contentType });
};
