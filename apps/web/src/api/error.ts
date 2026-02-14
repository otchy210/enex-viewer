interface ApiErrorResponse {
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export const buildErrorMessage = async (res: Response): Promise<ApiError> => {
  try {
    const data = (await res.json()) as ApiErrorResponse;
    if (typeof data.message === 'string' && data.message.length > 0) {
      return new ApiError(data.message, typeof data.code === 'string' ? data.code : undefined);
    }
  } catch {
    // ignore parsing errors
  }

  return new ApiError(`HTTP ${String(res.status)}`);
};

export const ensureOk = async (res: Response): Promise<Response> => {
  if (!res.ok) {
    throw await buildErrorMessage(res);
  }
  return res;
};
