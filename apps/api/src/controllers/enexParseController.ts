import fs from 'fs';

import { parseEnexFile, EnexParseError } from '../services/enexParseService.js';

import type { NextFunction, Request, Response } from 'express';

interface EnexParseLocals {
  enexFileBuffer?: Buffer;
  enexFilePath?: string;
  enexFileHash?: string;
}

const deleteTempFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // ignore cleanup errors
  }
};

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
      void deleteTempFile(filePath);
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
