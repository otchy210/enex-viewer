import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import routes from '../routes/index.js';

const createApp = () => {
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

describe('API integration', () => {
  it('GET /health returns ok true', async () => {
    const app = createApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('GET /api/message returns message payload', async () => {
    const app = createApp();

    const response = await request(app).get('/api/message');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Hello from TypeScript REST API');
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('POST /api/enex/parse accepts a valid ENEX upload', async () => {
    const app = createApp();
    const payload = Buffer.from('<en-export></en-export>');

    const response = await request(app)
      .post('/api/enex/parse')
      .attach('file', payload, { filename: 'sample.enex', contentType: 'application/xml' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      importId: expect.any(String),
      noteCount: 0,
      warnings: []
    });
  });

  it('POST /api/enex/parse rejects missing file uploads', async () => {
    const app = createApp();

    const response = await request(app).post('/api/enex/parse').field('note', 'missing-file');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'MISSING_FILE',
      message: 'file is required.'
    });
  });

  it('POST /api/enex/parse rejects non-ENEX files', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/enex/parse')
      .attach('file', Buffer.from('not-enex'), { filename: 'sample.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_FILE_TYPE',
      message: 'Invalid ENEX file type.'
    });
  });

  it('POST /api/enex/parse reports parse failures', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/enex/parse')
      .attach('file', Buffer.from('<note></note>'), {
        filename: 'invalid.enex',
        contentType: 'application/xml'
      });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      code: 'ENEX_PARSE_FAILED',
      message: 'Failed to parse ENEX content.'
    });
  });
});
