import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { clearImports } from '../repositories/importRepository.js';
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
  beforeEach(() => {
    clearImports();
  });

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
    const payload = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <title>Sample Note</title>
        <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
        <en-note>hello</en-note>]]></content>
      </note>
    </en-export>`);

    const response = await request(app)
      .post('/api/enex/parse')
      .attach('file', payload, { filename: 'sample.enex', contentType: 'application/xml' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      importId: expect.any(String),
      noteCount: 1,
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
      code: 'INVALID_ENEX',
      message: 'Missing <en-export> root element.'
    });
  });

  it('GET /api/imports/:importId/notes returns paginated notes', async () => {
    const app = createApp();
    const payload = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
      <en-export>
        <note>
          <title>First Note</title>
          <content><![CDATA[<en-note>hello world</en-note>]]></content>
          <created>20240101T000000Z</created>
          <updated>20240102T000000Z</updated>
          <tag>alpha</tag>
        </note>
        <note>
          <title>Second Note</title>
          <content><![CDATA[<en-note>another note</en-note>]]></content>
          <created>20240103T000000Z</created>
          <updated>20240104T000000Z</updated>
          <tag>beta</tag>
        </note>
      </en-export>`);

    const parseResponse = await request(app)
      .post('/api/enex/parse')
      .attach('file', payload, { filename: 'sample.enex', contentType: 'application/xml' });

    expect(parseResponse.status).toBe(200);

    const listResponse = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ limit: 1, offset: 1 });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(2);
    expect(listResponse.body.notes).toHaveLength(1);
    expect(listResponse.body.notes[0].title).toBe('First Note');
  });

  it('GET /api/imports/:importId/notes supports search query', async () => {
    const app = createApp();
    const payload = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
      <en-export>
        <note>
          <title>Kitchen Log</title>
          <content><![CDATA[<en-note>coffee beans</en-note>]]></content>
          <created>20240101T000000Z</created>
          <updated>20240102T000000Z</updated>
          <tag>coffee</tag>
        </note>
        <note>
          <title>Travel Plan</title>
          <content><![CDATA[<en-note>tokyo trip</en-note>]]></content>
          <created>20240103T000000Z</created>
          <updated>20240104T000000Z</updated>
          <tag>travel</tag>
        </note>
      </en-export>`);

    const parseResponse = await request(app)
      .post('/api/enex/parse')
      .attach('file', payload, { filename: 'sample.enex', contentType: 'application/xml' });

    const listResponse = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ q: 'coffee' });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(1);
    expect(listResponse.body.notes[0].title).toBe('Kitchen Log');
  });

  it('GET /api/imports/:importId/notes returns 404 for unknown import', async () => {
    const app = createApp();

    const response = await request(app).get('/api/imports/missing/notes');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'IMPORT_NOT_FOUND',
      message: 'Import session not found.'
    });
  });

  it('GET /api/imports/:importId/notes validates query params', async () => {
    const app = createApp();
    const payload = Buffer.from('<en-export></en-export>');
    const parseResponse = await request(app)
      .post('/api/enex/parse')
      .attach('file', payload, { filename: 'sample.enex', contentType: 'application/xml' });

    const response = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ limit: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'limit must be a positive integer.'
    });
  });

  it('GET /api/imports/:importId/notes/:noteId returns note detail', async () => {
    const app = createApp();
    const payload = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <guid>note-123</guid>
        <title>Sample Detail</title>
        <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
        <en-note>Detail Body</en-note>]]></content>
        <created>20240101T000000Z</created>
        <updated>20240102T000000Z</updated>
        <tag>demo</tag>
        <resource>
          <data encoding="base64"><![CDATA[AAAA]]></data>
          <mime>image/png</mime>
          <resource-attributes>
            <file-name>image.png</file-name>
          </resource-attributes>
        </resource>
      </note>
    </en-export>`);

    const parseResponse = await request(app)
      .post('/api/enex/parse')
      .attach('file', payload, { filename: 'sample.enex', contentType: 'application/xml' });

    const detailResponse = await request(app).get(
      `/api/imports/${parseResponse.body.importId}/notes/note-123`
    );

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toEqual({
      id: 'note-123',
      title: 'Sample Detail',
      createdAt: '20240101T000000Z',
      updatedAt: '20240102T000000Z',
      tags: ['demo'],
      contentHtml: expect.stringContaining('Detail Body'),
      resources: [
        {
          id: 'resource-1-1',
          fileName: 'image.png',
          mime: 'image/png',
          size: 3
        }
      ]
    });
  });

  it('GET /api/imports/:importId/notes/:noteId returns 404 for missing import', async () => {
    const app = createApp();

    const response = await request(app).get('/api/imports/missing-import/notes/note-123');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'IMPORT_NOT_FOUND',
      message: 'Import session not found.'
    });
  });

  it('GET /api/imports/:importId/notes/:noteId returns 404 for missing note', async () => {
    const app = createApp();
    const payload = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <guid>note-123</guid>
        <title>Sample Detail</title>
        <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
        <en-note>Detail Body</en-note>]]></content>
      </note>
    </en-export>`);

    const parseResponse = await request(app)
      .post('/api/enex/parse')
      .attach('file', payload, { filename: 'sample.enex', contentType: 'application/xml' });

    const response = await request(app).get(
      `/api/imports/${parseResponse.body.importId}/notes/missing-note`
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'NOTE_NOT_FOUND',
      message: 'Note not found.'
    });
  });
});
