import { parseEnexFile, EnexParseError } from '../services/enexParseService.js';

import type { NextFunction, Request, Response } from 'express';


interface EnexParseLocals {
  enexFileBuffer?: Buffer;
}

export const enexParseController = (
  _req: Request,
  res: Response<unknown, EnexParseLocals>,
  next: NextFunction
) => {
  try {
    const fileBuffer = res.locals.enexFileBuffer;
    if (!Buffer.isBuffer(fileBuffer)) {
      return res.status(400).json({
        code: 'INVALID_MULTIPART',
        message: 'Request body must be multipart/form-data.'
      });
    }

    const result = parseEnexFile({ data: fileBuffer });
    return res.json(result);
  } catch (error) {
    if (error instanceof EnexParseError) {
      const payload: { code: string; message: string; details?: unknown } = {
        code: error.code,
        message: error.message
      };
      if (error.details !== undefined) {
        payload.details = error.details;
      }
      return res.status(422).json(payload);
    }

    next(error);
    return;
  }
};
