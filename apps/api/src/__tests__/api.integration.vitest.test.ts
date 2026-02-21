import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { mkdtempSync, readdirSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import {
  buildEnexPayload,
  cleanupApiTestDataDirectory,
  createTempApiTestDataDirectory,
  initializeApiTestState,
  uploadEnex
} from './testHelpers.js';

interface ParseResponse {
  importId: string;
  hash: string;
  noteCount: number;
  warnings: string[];
}

interface NoteListResponse {
  total: number;
  notes: { title: string }[];
}

interface ImportHashLookupResponse {
  hash: string;
  importId: string | null;
  shouldUpload: boolean;
  message: string;
}

interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseResponseBody = <T>(body: unknown, guard: (value: unknown) => value is T): T => {
  if (!guard(body)) {
    throw new Error('Unexpected API response body.');
  }

  return body;
};

const isParseResponse = (value: unknown): value is ParseResponse =>
  isRecord(value) &&
  typeof value.importId === 'string' &&
  typeof value.hash === 'string' &&
  typeof value.noteCount === 'number' &&
  Array.isArray(value.warnings);

const isNoteListResponse = (value: unknown): value is NoteListResponse =>
  isRecord(value) &&
  typeof value.total === 'number' &&
  Array.isArray(value.notes) &&
  value.notes.every((note) => isRecord(note) && typeof note.title === 'string');

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string';

const isImportHashLookupResponse = (value: unknown): value is ImportHashLookupResponse =>
  isRecord(value) &&
  typeof value.hash === 'string' &&
  (typeof value.importId === 'string' || value.importId === null) &&
  typeof value.shouldUpload === 'boolean' &&
  typeof value.message === 'string';

describe('API integration', () => {
  beforeEach(() => {
    initializeApiTestState();
  });

  it('GET /health returns ok true', async () => {
    const app = createApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('POST /api/enex/parse accepts a valid ENEX upload', async () => {
    const app = createApp();
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
    const body = parseResponseBody(response.body as unknown, isParseResponse);

    expect(body.importId).not.toHaveLength(0);
    expect(body.hash).toHaveLength(64);
    expect(body.noteCount).toBe(1);
    expect(body.warnings).toEqual([]);
  });

  it('POST /api/enex/parse returns existing importId when uploading identical file', async () => {
    const dataDirectory = createTempApiTestDataDirectory();

    try {
      initializeApiTestState(dataDirectory);
      const app = createApp();
      const payload = buildEnexPayload(`
        <note>
          <title>Duplicated Note</title>
          <content><![CDATA[<en-note>duplicate payload</en-note>]]></content>
        </note>
      `);

      const firstResponse = await uploadEnex(app, payload);
      expect(firstResponse.status).toBe(200);
      const firstBody = parseResponseBody(firstResponse.body as unknown, isParseResponse);

      const secondResponse = await uploadEnex(app, payload);
      expect(secondResponse.status).toBe(200);
      const secondBody = parseResponseBody(secondResponse.body as unknown, isParseResponse);

      expect(secondBody.importId).toBe(firstBody.importId);
      expect(secondBody.hash).toBe(firstBody.hash);
      expect(secondBody.noteCount).toBe(firstBody.noteCount);
    } finally {
      cleanupApiTestDataDirectory(dataDirectory);
    }
  });

  it('POST /api/imports/hash-lookup validates hash format', async () => {
    const app = createApp();

    const response = await request(app).post('/api/imports/hash-lookup').send({ hash: 'abc' });

    expect(response.status).toBe(400);
    const body = parseResponseBody(response.body as unknown, isApiErrorResponse);
    expect(body).toEqual({
      code: 'INVALID_HASH',
      message: 'hash must be a SHA-256 hex string.'
    });
  });

  it('POST /api/imports/hash-lookup guides lookup -> parse -> reuse flow', async () => {
    const dataDirectory = createTempApiTestDataDirectory();

    try {
      initializeApiTestState(dataDirectory);
      const app = createApp();
      const payload = buildEnexPayload(`
        <note>
          <title>Lookup Flow Note</title>
          <content><![CDATA[<en-note>lookup flow</en-note>]]></content>
        </note>
      `);

      const payloadHash = createHash('sha256').update(payload).digest('hex');
      const beforeLookupResponse = await request(app)
        .post('/api/imports/hash-lookup')
        .send({ hash: payloadHash });

      expect(beforeLookupResponse.status).toBe(200);
      const beforeLookupBody = parseResponseBody(
        beforeLookupResponse.body as unknown,
        isImportHashLookupResponse
      );
      expect(beforeLookupBody.importId).toBeNull();
      expect(beforeLookupBody.shouldUpload).toBe(true);
      expect(beforeLookupBody.message).toContain('POST /api/enex/parse');

      const parseResponse = await uploadEnex(app, payload);
      expect(parseResponse.status).toBe(200);
      const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);

      const afterLookupResponse = await request(app)
        .post('/api/imports/hash-lookup')
        .send({ hash: payloadHash });

      expect(afterLookupResponse.status).toBe(200);
      const afterLookupBody = parseResponseBody(
        afterLookupResponse.body as unknown,
        isImportHashLookupResponse
      );
      expect(afterLookupBody.importId).toBe(parseBody.importId);
      expect(afterLookupBody.shouldUpload).toBe(false);
      expect(afterLookupBody.message).toContain('skip upload');
    } finally {
      cleanupApiTestDataDirectory(dataDirectory);
    }
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
      .attach('file', Buffer.from('not-enex'), {
        filename: 'sample.txt',
        contentType: 'text/plain'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_FILE_TYPE',
      message: 'Invalid ENEX file type.'
    });
  });


  
  it('POST /api/enex/parse rejects files larger than configured limit', async () => {
    process.env.ENEX_PARSE_MAX_UPLOAD_BYTES = '16';
    const app = createApp();

    const response = await uploadEnex(app, Buffer.from('12345678901234567'), {
      filename: 'oversized.enex',
      contentType: 'application/xml'
    });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds the allowed limit.'
    });

    delete process.env.ENEX_PARSE_MAX_UPLOAD_BYTES;
  });

  it('POST /api/enex/parse reports parse failures', async () => {
    const app = createApp();

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
    const app = createApp();
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

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const listResponse = await request(app)
      .get(`/api/imports/${parseBody.importId}/notes`)
      .query({ limit: 1, offset: 1 });

    expect(listResponse.status).toBe(200);
    const listBody = parseResponseBody(listResponse.body as unknown, isNoteListResponse);

    expect(listBody.total).toBe(2);
    expect(listBody.notes).toHaveLength(1);
    expect(listBody.notes[0]?.title).toBe('First Note');
  });

  it('GET /api/imports/:importId/notes supports search query', async () => {
    const app = createApp();
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

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const listResponse = await request(app)
      .get(`/api/imports/${parseBody.importId}/notes`)
      .query({ q: 'coffee' });

    expect(listResponse.status).toBe(200);
    const listBody = parseResponseBody(listResponse.body as unknown, isNoteListResponse);

    expect(listBody.total).toBe(1);
    expect(listBody.notes[0]?.title).toBe('Kitchen Log');
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
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const response = await request(app)
      .get(`/api/imports/${parseBody.importId}/notes`)
      .query({ limit: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'limit must be a positive integer.'
    });
  });

  it('GET /api/imports/:importId/notes rejects array query params', async () => {
    const app = createApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const response = await request(app)
      .get(`/api/imports/${parseBody.importId}/notes`)
      .query({ limit: ['1', '2'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'limit must be a single value.'
    });
  });

  it('GET /api/imports/:importId/notes rejects non-integer query values', async () => {
    const app = createApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const response = await request(app)
      .get(`/api/imports/${parseBody.importId}/notes`)
      .query({ offset: '10abc' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'offset must be a non-negative integer.'
    });
  });

  it('GET /api/imports/:importId/notes/:noteId returns note detail', async () => {
    const app = createApp();
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

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const detailResponse = await request(app).get(
      `/api/imports/${parseBody.importId}/notes/note-123`
    );

    expect(detailResponse.status).toBe(200);
    const detailBody = parseResponseBody(detailResponse.body as unknown, isRecord);

    expect(detailBody.id).toBe('note-123');
    expect(detailBody.title).toBe('Sample Detail');
    expect(detailBody.createdAt).toBe('20240101T000000Z');
    expect(detailBody.updatedAt).toBe('20240102T000000Z');
    expect(detailBody.tags).toEqual(['demo']);
    expect(typeof detailBody.contentHtml).toBe('string');
    if (typeof detailBody.contentHtml === 'string') {
      expect(detailBody.contentHtml).toContain('Detail Body');
    }
    expect(detailBody.resources).toEqual([
      {
        id: 'resource-1-1',
        fileName: 'image.png',
        mime: 'image/png',
        size: 3
      }
    ]);
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

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const response = await request(app).get(
      `/api/imports/${parseBody.importId}/notes/missing-note`
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'NOTE_NOT_FOUND',
      message: 'Note not found.'
    });
  });

  it('POST /api/enex/parse rejects non-multipart requests', async () => {
    const app = createApp();

    const response = await request(app).post('/api/enex/parse').send({ file: 'nope' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_MULTIPART',
      message: 'Request body must be multipart/form-data.'
    });
  });

  it('POST /api/enex/parse reports invalid XML', async () => {
    const app = createApp();

    const response = await uploadEnex(app, Buffer.from('<en-export><note></en-export>'));

    expect(response.status).toBe(422);
    const body = parseResponseBody(response.body as unknown, isApiErrorResponse);

    expect(body.code).toBe('INVALID_XML');
    expect(body.message).toBe(
      'The uploaded ENEX file is malformed XML. Please export the file again and retry.'
    );
  });

  it('POST /api/enex/parse returns warnings for skipped notes', async () => {
    const app = createApp();
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
    const body = parseResponseBody(response.body as unknown, isParseResponse);

    expect(body.noteCount).toBe(1);
    expect(body.warnings).toHaveLength(1);
    expect(body.warnings[0]).toContain('Incomplete Note');
  });

  it('GET /api/imports/:importId/notes rejects array search params', async () => {
    const app = createApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const response = await request(app)
      .get(`/api/imports/${parseBody.importId}/notes`)
      .query({ q: ['one', 'two'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'q must be a single string.'
    });
  });

  it('GET /api/imports/:importId/notes rejects limit over max', async () => {
    const app = createApp();
    const payload = buildEnexPayload('');
    const parseResponse = await uploadEnex(app, payload);

    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);
    const response = await request(app)
      .get(`/api/imports/${parseBody.importId}/notes`)
      .query({ limit: 200 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_QUERY',
      message: 'limit must be at most 100.'
    });
  });

  it('stores resources on filesystem and reuses by hash', async () => {
    const dataDirectory = createTempApiTestDataDirectory();

    try {
      initializeApiTestState(dataDirectory);
      const app = createApp();
      const payload = buildEnexPayload(`
        <note>
          <guid>note-1</guid>
          <title>Resource One</title>
          <content><![CDATA[<en-note>one</en-note>]]></content>
          <resource>
            <data encoding="base64"><![CDATA[SGVsbG8=]]></data>
            <mime>text/plain</mime>
            <resource-attributes><file-name>a.txt</file-name></resource-attributes>
          </resource>
        </note>
        <note>
          <guid>note-2</guid>
          <title>Resource Two</title>
          <content><![CDATA[<en-note>two</en-note>]]></content>
          <resource>
            <data encoding="base64"><![CDATA[SGVsbG8=]]></data>
            <mime>text/plain</mime>
            <resource-attributes><file-name>b.txt</file-name></resource-attributes>
          </resource>
        </note>
      `);

      const response = await uploadEnex(app, payload);
      expect(response.status).toBe(200);

      const resourcesDirectory = path.join(dataDirectory, 'resources');
      const files = readdirSync(resourcesDirectory);
      expect(files).toHaveLength(1);
    } finally {
      cleanupApiTestDataDirectory(dataDirectory);
    }
  });

  it('GET /api/imports/:importId/notes/:noteId/resources/:resourceId streams resource', async () => {
    const app = createApp();
    const payload = buildEnexPayload(`
      <note>
        <guid>note-123</guid>
        <title>Sample Detail</title>
        <content><![CDATA[<en-note>Detail Body</en-note>]]></content>
        <resource>
          <data encoding="base64"><![CDATA[SGVsbG8=]]></data>
          <mime>text/plain</mime>
          <resource-attributes><file-name>hello.txt</file-name></resource-attributes>
        </resource>
      </note>
    `);

    const parseResponse = await uploadEnex(app, payload);
    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);

    const response = await request(app)
      .get(`/api/imports/${parseBody.importId}/notes/note-123/resources/resource-1-1`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(chunk as Buffer);
        });
        res.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.headers['content-disposition']).toContain('hello.txt');
    const responseBody = response.body as Buffer;
    expect(responseBody.toString('utf-8')).toBe('Hello');
  });

  it('POST /api/imports/:importId/resources/bulk-download returns zip stream', async () => {
    const app = createApp();
    const payload = buildEnexPayload(`
      <note>
        <guid>note-123</guid>
        <title>Sample Detail</title>
        <content><![CDATA[<en-note>Detail Body</en-note>]]></content>
        <resource>
          <data encoding="base64"><![CDATA[SGVsbG8=]]></data>
          <mime>text/plain</mime>
          <resource-attributes><file-name>hello.txt</file-name></resource-attributes>
        </resource>
      </note>
    `);

    const parseResponse = await uploadEnex(app, payload);
    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);

    const response = await request(app)
      .post(`/api/imports/${parseBody.importId}/resources/bulk-download`)
      .send({ resources: [{ noteId: 'note-123', resourceId: 'resource-1-1' }] })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(chunk as Buffer);
        });
        res.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/zip');
    const responseBody = response.body as Buffer;
    const zipSignature = responseBody.subarray(0, 4).toString('hex');
    expect(zipSignature).toBe('504b0304');
  });

  it('POST /api/imports/:importId/resources/bulk-download sanitizes resource filename', async () => {
    const app = createApp();
    const payload = buildEnexPayload(`
      <note>
        <guid>note-123</guid>
        <title>Path Traversal Name</title>
        <content><![CDATA[<en-note>Detail Body</en-note>]]></content>
        <resource>
          <data encoding="base64"><![CDATA[SGVsbG8=]]></data>
          <mime>text/plain</mime>
          <resource-attributes><file-name>../../tmp/evil.txt</file-name></resource-attributes>
        </resource>
      </note>
    `);

    const parseResponse = await uploadEnex(app, payload);
    const parseBody = parseResponseBody(parseResponse.body as unknown, isParseResponse);

    const response = await request(app)
      .post(`/api/imports/${parseBody.importId}/resources/bulk-download`)
      .send({ resources: [{ noteId: 'note-123', resourceId: 'resource-1-1' }] })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(chunk as Buffer);
        });
        res.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      });

    expect(response.status).toBe(200);
    const zipBuffer = response.body as Buffer;
    const tempDirectory = mkdtempSync(path.join(os.tmpdir(), 'enex-viewer-zip-test-'));
    const zipPath = path.join(tempDirectory, 'resources.zip');
    writeFileSync(zipPath, zipBuffer);

    const fileListText = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf-8' });
    expect(fileListText).toContain('note-123/evil.txt');
    expect(fileListText).not.toContain('../');
  });
});
