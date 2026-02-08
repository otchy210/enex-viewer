import type { NextFunction, Request, Response } from 'express';

import { parseEnexFile, EnexParseError } from '../services/enexParseService.js';

const isLikelyEnex = (fileName?: string, contentType?: string) => {
  if (fileName && fileName.toLowerCase().endsWith('.enex')) {
    return true;
  }

  if (contentType && contentType.toLowerCase().includes('xml')) {
    return true;
  }

  return false;
};

const buildHeaders = (headers: Request['headers']) => {
  const result = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result.set(key, value);
    } else if (Array.isArray(value)) {
      result.set(key, value.join(', '));
    }
  });
  return result;
};

export const enexParseController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        code: 'INVALID_MULTIPART',
        message: 'Request body must be multipart/form-data.'
      });
    }

    const request = new Request('http://localhost/api/enex/parse', {
      method: 'POST',
      headers: buildHeaders(req.headers),
      body: req.body
    });
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return res.status(400).json({
        code: 'MISSING_FILE',
        message: 'file is required.'
      });
    }

    const fileName = 'name' in file ? file.name : undefined;
    const contentType = 'type' in file ? file.type : undefined;
    if (!isLikelyEnex(fileName, contentType)) {
      return res.status(400).json({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid ENEX file type.'
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = parseEnexFile({ data: buffer });
    return res.json(result);
  } catch (error) {
    if (error instanceof EnexParseError) {
      return res.status(422).json({
        code: error.code,
        message: error.message
      });
    }

    return next(error);
  }
};
