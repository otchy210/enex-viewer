import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildEnexPayload, createTestApp, initializeApiTestState, uploadEnex } from './testHelpers.js';

describe('API integration', () => {
  beforeEach(() => {
    initializeApiTestState();
  });

  it('GET /health returns ok true', async () => {
    const app = createTestApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('GET /api/message returns message payload', async () => {
    const app = createTestApp();

    const response = await request(app).get('/api/message');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Hello from TypeScript REST API');
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('POST /api/enex/parse accepts a valid ENEX upload', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload(`
      <note>
        <title>Sample Note</title>
        <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
        <en-note>hello</en-note>]]></content>
      </note>
    `);

    const response = await uploadEnex(app, payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      importId: expect.any(String),
      noteCount: 1,
      warnings: []
    });
  });

  it('POST /api/enex/parse rejects missing file uploads', async () => {
    const app = createTestApp();

    const response = await request(app).post('/api/enex/parse').field('note', 'missing-file');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'MISSING_FILE',
      message: 'file is required.'
    });
  });

  it('POST /api/enex/parse rejects non-ENEX files', async () => {
    const app = createTestApp();

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
    const app = createTestApp();

    const response = await uploadEnex(app, Buffer.from('<note></note>'), {
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
    const app = createTestApp();
    const payload = buildEnexPayload(`
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
      `);

    const parseResponse = await uploadEnex(app, payload);

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
    const app = createTestApp();
    const payload = buildEnexPayload(`
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
      `);

    const parseResponse = await uploadEnex(app, payload);

    const listResponse = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ q: 'coffee' });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(1);
    expect(listResponse.body.notes[0].title).toBe('Kitchen Log');
  });

  it('GET /api/imports/:importId/notes returns 404 for unknown import', async () => {
    const app = createTestApp();

    const response = await request(app).get('/api/imports/missing/notes');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'IMPORT_NOT_FOUND',
      message: 'Import session not found.'
    });
  });

  it('GET /api/imports/:importId/notes validates query params', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const response = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ limit: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'limit must be a positive integer.'
    });
  });

  it('GET /api/imports/:importId/notes rejects array query params', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const response = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ limit: ['1', '2'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'limit must be a single value.'
    });
  });

  it('GET /api/imports/:importId/notes rejects non-integer query values', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const response = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ offset: '10abc' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'offset must be a non-negative integer.'
    });
  });

  it('GET /api/imports/:importId/notes/:noteId returns note detail', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload(`
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
    `);

    const parseResponse = await uploadEnex(app, payload);

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
    const app = createTestApp();

    const response = await request(app).get('/api/imports/missing-import/notes/note-123');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'IMPORT_NOT_FOUND',
      message: 'Import session not found.'
    });
  });

  it('GET /api/imports/:importId/notes/:noteId returns 404 for missing note', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload(`
      <note>
        <guid>note-123</guid>
        <title>Sample Detail</title>
        <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
        <en-note>Detail Body</en-note>]]></content>
      </note>
    `);

    const parseResponse = await uploadEnex(app, payload);

    const response = await request(app).get(
      `/api/imports/${parseResponse.body.importId}/notes/missing-note`
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'NOTE_NOT_FOUND',
      message: 'Note not found.'
    });
  });

  it('POST /api/enex/parse rejects non-multipart requests', async () => {
    const app = createTestApp();

    const response = await request(app).post('/api/enex/parse').send({ file: 'nope' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_MULTIPART',
      message: 'Request body must be multipart/form-data.'
    });
  });

  it('POST /api/enex/parse reports invalid XML', async () => {
    const app = createTestApp();

    const response = await uploadEnex(app, Buffer.from('<en-export><note></en-export>'));

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('INVALID_XML');
    expect(response.body.message).toBe('Failed to parse XML.');
    expect(response.body.details).toBeDefined();
  });

  it('POST /api/enex/parse returns warnings for skipped notes', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload(`
      <note>
        <title>Incomplete Note</title>
      </note>
      <note>
        <title>Complete Note</title>
        <content><![CDATA[<en-note>ok</en-note>]]></content>
      </note>
    `);

    const response = await uploadEnex(app, payload);

    expect(response.status).toBe(200);
    expect(response.body.noteCount).toBe(1);
    expect(response.body.warnings).toHaveLength(1);
    expect(response.body.warnings[0]).toContain('Incomplete Note');
  });

  it('GET /api/imports/:importId/notes rejects array search params', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const response = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ q: ['one', 'two'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'q must be a single string.'
    });
  });

  it('GET /api/imports/:importId/notes rejects limit over max', async () => {
    const app = createTestApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const response = await request(app)
      .get(`/api/imports/${parseResponse.body.importId}/notes`)
      .query({ limit: 200 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'limit must be at most 100.'
    });
  });
});
