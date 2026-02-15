import { requestJson } from './client';

export interface ParseEnexResponse {
  importId: string;
  noteCount: number;
  warnings: string[];
}

export interface HashLookupResponse {
  hash: string;
  importId: string | null;
  shouldUpload: boolean;
  message: string;
}

interface HashLookupOptions {
  signal?: AbortSignal;
}

export async function parseEnexFile(file: File): Promise<ParseEnexResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return requestJson<ParseEnexResponse>('/api/enex/parse', {
    method: 'POST',
    body: formData
  });
}

export async function lookupImportByHash(
  hash: string,
  options: HashLookupOptions = {}
): Promise<HashLookupResponse> {
  return requestJson<HashLookupResponse>('/api/imports/hash-lookup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ hash }),
    signal: options.signal
  });
}
