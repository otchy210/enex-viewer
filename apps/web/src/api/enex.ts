import { ensureOk } from './error';

export type ParseEnexResponse = {
  importId: string;
  noteCount: number;
  warnings: string[];
};

export async function parseEnexFile(file: File): Promise<ParseEnexResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/enex/parse', {
    method: 'POST',
    body: formData
  });

  await ensureOk(res);
  return (await res.json()) as ParseEnexResponse;
}
