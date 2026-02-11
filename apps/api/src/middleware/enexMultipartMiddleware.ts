import type { NextFunction, Request, Response } from 'express';

const isLikelyEnex = (fileName?: string, contentType?: string) => {
  if (fileName?.toLowerCase().endsWith('.enex') === true) {
    return true;
  }

  if (contentType?.toLowerCase().includes('xml') === true) {
    return true;
  }

  return false;
};

const extractMultipartContentType = (headers: Request['headers']): string | null => {
  const headerValue = headers['content-type'];
  if (typeof headerValue !== 'string') {
    return null;
  }

  return headerValue.toLowerCase().includes('multipart/form-data') ? headerValue : null;
};

export const parseEnexMultipart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        code: 'INVALID_MULTIPART',
        message: 'Request body must be multipart/form-data.'
      });
    }

    const contentType = extractMultipartContentType(req.headers);
    if (contentType === null) {
      return res.status(400).json({
        code: 'INVALID_MULTIPART',
        message: 'Request body must be multipart/form-data.'
      });
    }

    const request = new Request('http://localhost/api/enex/parse', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: req.body
    });

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Kept for current raw-body parser behavior in Node runtime.
    const formData = await request.formData();
    const file = formData.get('file');
    if (file === null || typeof file === 'string') {
      return res.status(400).json({
        code: 'MISSING_FILE',
        message: 'file is required.'
      });
    }

    const fileName = 'name' in file ? file.name : undefined;
    const fileContentType = 'type' in file ? file.type : undefined;
    if (!isLikelyEnex(fileName, fileContentType)) {
      return res.status(400).json({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid ENEX file type.'
      });
    }

    res.locals.enexFileBuffer = Buffer.from(await file.arrayBuffer());
    next(); return;
  } catch (error) {
    next(error); return;
  }
};
