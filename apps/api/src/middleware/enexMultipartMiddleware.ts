/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, promise/no-promise-in-callback, promise/prefer-await-to-then */
import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Writable } from 'stream';

import formidable from 'formidable';

import type { NextFunction, Request, Response } from 'express';

const ONE_GIBIBYTE = 1024 * 1024 * 1024;

const parseMaxUploadBytes = (): number => {
  const raw = process.env.ENEX_PARSE_MAX_UPLOAD_BYTES;
  if (raw === undefined) {
    return ONE_GIBIBYTE;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ONE_GIBIBYTE;
};

const isLikelyEnex = (fileName?: string, contentType?: string): boolean => {
  if (fileName?.toLowerCase().endsWith('.enex') === true) {
    return true;
  }

  if (contentType?.toLowerCase().includes('xml') === true) {
    return true;
  }

  return false;
};

const hasMultipartContentType = (headers: Request['headers']): boolean => {
  const headerValue = headers['content-type'];
  return typeof headerValue === 'string' && headerValue.toLowerCase().includes('multipart/form-data');
};

interface EnexParseLocals {
  enexFilePath?: string;
  enexFileHash?: string;
  cleanupEnexTempFile?: () => Promise<void>;
}

const createTempFilePath = (): string => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'enex-viewer-'));
  return path.join(tempDirectory, `${randomUUID()}.enex`);
};

const cleanupTempFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // ignore cleanup errors
  }

  try {
    await fs.promises.rm(path.dirname(filePath), { recursive: false, force: true });
  } catch {
    // ignore cleanup errors
  }
};

export const parseEnexMultipart = (
  req: Request,
  res: Response<unknown, EnexParseLocals>,
  next: NextFunction
): void => {
  if (!hasMultipartContentType(req.headers)) {
    res.status(400).json({
      code: 'INVALID_MULTIPART',
      message: 'Request body must be multipart/form-data.'
    });
    return;
  }

  const maxUploadBytes = parseMaxUploadBytes();
  const contentLength = Number.parseInt(req.headers['content-length'] ?? '0', 10);
  if (Number.isFinite(contentLength) && contentLength > maxUploadBytes) {
    res.status(413).json({
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds the allowed limit.'
    });
    return;
  }

  const hash = createHash('sha256');
  const tempFilePath = createTempFilePath();
  const writeStream = fs.createWriteStream(tempFilePath);

  const form = formidable({
    maxFiles: 1,
    maxFileSize: maxUploadBytes,
    allowEmptyFiles: false,
    fileWriteStreamHandler: () =>
      new Writable({
        write(chunk: Buffer, _encoding, callback) {
          if (!writeStream.write(chunk)) {
            writeStream.once('drain', callback);
          } else {
            callback();
          }
          hash.update(chunk);
        },
        final(callback) {
          writeStream.end(callback);
        }
      })
  });

  form.parse(req, (error: unknown, _fields: unknown, files: Record<string, unknown>) => {
    if (error) {
      if ((error as { httpCode?: number }).httpCode === 413) {
        void cleanupTempFile(tempFilePath);
        res.status(413).json({
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the allowed limit.'
        });
        return;
      }

      writeStream.destroy();
      void cleanupTempFile(tempFilePath);
      next(error);
      return;
    }

    const file = files.file;
    const uploaded = Array.isArray(file) ? file[0] : file;
    if (uploaded === undefined || uploaded === null || typeof uploaded !== 'object') {
      void cleanupTempFile(tempFilePath);
      res.status(400).json({
        code: 'MISSING_FILE',
        message: 'file is required.'
      });
      return;
    }

    const originalFilename = 'originalFilename' in uploaded ? (uploaded.originalFilename as string | null | undefined) : undefined;
    const mimeType = 'mimetype' in uploaded ? (uploaded.mimetype as string | null | undefined) : undefined;

    if (!isLikelyEnex(originalFilename ?? undefined, mimeType ?? undefined)) {
      res.status(400).json({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid ENEX file type.'
      });
      void cleanupTempFile(tempFilePath);
      return;
    }

    res.locals.enexFilePath = tempFilePath;
    res.locals.enexFileHash = hash.digest('hex');
    res.locals.cleanupEnexTempFile = async () => cleanupTempFile(tempFilePath);
    next();
  });
};
