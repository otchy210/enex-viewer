import type express from 'express';
import request from 'supertest';

import { createApp } from '../app.js';
import { clearImports } from '../repositories/importRepository.js';
import { clearImportSessions } from '../repositories/importSessionRepository.js';

type UploadOptions = {
  filename?: string;
  contentType?: string;
};

export const createTestApp = () => createApp();

export const initializeApiTestState = (): void => {
  clearImports();
  clearImportSessions();
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
