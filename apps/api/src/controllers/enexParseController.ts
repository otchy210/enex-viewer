import { parseEnexFile, EnexParseError } from '../services/enexParseService.js';

import type { NextFunction, Request, Response } from 'express';

import fs from 'fs';

interface EnexParseLocals {
  enexFileBuffer?: Buffer;
  enexFilePath?: string;
  enexFileHash?: string;
}

export const enexParseController = (
  _req: Request,
  res: Response<unknown, EnexParseLocals>,
  next: NextFunction
): void => {
  try {
    const filePath = res.locals.enexFilePath;
    const fileHash = res.locals.enexFileHash;
    if (typeof filePath !== 'string' || filePath.length === 0) {
      res.status(400).json({
        code: 'INVALID_MULTIPART',
        message: 'Request body must be multipart/form-data.'
      });
      return;
    }

    if (typeof fileHash !== 'string' || fileHash.length === 0) {
      res.status(400).json({
        code: 'INVALID_HASH',
        message: 'Failed to compute file hash.'
      });
      return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    try {
      const result = parseEnexFile({ data: fileBuffer, hash: fileHash });
      res.json(result);
    } finally {
      fs.promises.unlink(filePath).catch(() => undefined);
    }
    return;
  } catch (error) {
    if (error instanceof EnexParseError) {
      const payload: { code: string; message: string } = {
        code: error.code,
        message: error.message
      };
      res.status(422).json(payload);
      return;
    }

    next(error);
    return;
  }
};
