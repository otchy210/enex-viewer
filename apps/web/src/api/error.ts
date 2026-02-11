interface ApiErrorResponse {
  message?: string;
}

export const buildErrorMessage = async (res: Response): Promise<string> => {
  try {
    const data = (await res.json()) as ApiErrorResponse;
    if (typeof data.message === 'string' && data.message.length > 0) {
      return data.message;
    }
  } catch {
    // ignore parsing errors
  }

  return `HTTP ${String(res.status)}`;
};

export const ensureOk = async (res: Response): Promise<Response> => {
  if (!res.ok) {
    throw new Error(await buildErrorMessage(res));
  }
  return res;
};
