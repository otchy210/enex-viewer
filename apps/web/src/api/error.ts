type ApiErrorResponse = {
  message?: string;
};

export const buildErrorMessage = async (res: Response): Promise<string> => {
  try {
    const data = (await res.json()) as ApiErrorResponse;
    if (data?.message) {
      return data.message;
    }
  } catch {
    // ignore parsing errors
  }

  return `HTTP ${res.status}`;
};
