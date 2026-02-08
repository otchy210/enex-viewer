export type ParseEnexResponse = {
  importId: string;
  noteCount: number;
  warnings: string[];
};

type ApiErrorResponse = {
  message?: string;
};

const buildErrorMessage = async (res: Response): Promise<string> => {
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

export async function parseEnexFile(file: File): Promise<ParseEnexResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/enex/parse', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    throw new Error(await buildErrorMessage(res));
  }

  return (await res.json()) as ParseEnexResponse;
}
