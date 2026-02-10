import type express from 'express';

export type ApiErrorResponse = {
  code: string;
  message: string;
  details?: unknown;
};

export const createApiErrorResponse = (
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse => {
  if (details === undefined) {
    return { code, message };
  }

  return { code, message, details };
};

export const sendApiErrorResponse = (
  res: express.Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void => {
  res.status(status).json(createApiErrorResponse(code, message, details));
};
