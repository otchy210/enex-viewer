import type { Request, Response } from 'express';

import { parseMultipartSingleFile, MultipartParseError } from '../lib/multipart.js';
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

export const enexParseController = (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        code: 'INVALID_MULTIPART',
        message: 'Request body must be multipart/form-data.'
      });
    }

    const file = parseMultipartSingleFile(req.body, req.headers['content-type']);
    if (!isLikelyEnex(file.fileName, file.contentType)) {
      return res.status(400).json({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid ENEX file type.'
      });
    }

    const result = parseEnexFile(file);
    return res.json(result);
  } catch (error) {
    if (error instanceof MultipartParseError) {
      return res.status(400).json({
        code: error.code,
        message: error.message
      });
    }

    if (error instanceof EnexParseError) {
      return res.status(422).json({
        code: error.code,
        message: error.message
      });
    }

    throw error;
  }
};
