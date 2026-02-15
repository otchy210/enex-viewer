import { parseEnexFile, EnexParseError } from '../services/enexParseService.js';

import type { NextFunction, Request, Response } from 'express';

interface EnexParseLocals {
  enexFileBuffer?: Buffer;
  enexFileHash?: string;
}

export const enexParseController = (
  _req: Request,
  res: Response<unknown, EnexParseLocals>,
  next: NextFunction
): void => {
  try {
    const fileBuffer = res.locals.enexFileBuffer;
    const fileHash = res.locals.enexFileHash;
    if (!Buffer.isBuffer(fileBuffer)) {
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

    const result = parseEnexFile({ data: fileBuffer, hash: fileHash });
    res.json(result);
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
