import { ensureOk } from './error';

export interface NoteSummary {
  id: string;
  title: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  tags: string[];
  excerpt: string;
}

export interface NoteListResponse {
  total: number;
  notes: NoteSummary[];
}

export interface NoteListQuery {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface NoteResource {
  id: string;
  fileName?: string;
  mime?: string;
  size?: number;
}

export interface NoteDetail {
  id: string;
  title: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  tags: string[];
  contentHtml: string;
  resources: NoteResource[];
}

export interface BulkDownloadResource {
  noteId: string;
  resourceId: string;
}

export interface BulkDownloadResponse {
  blob: Blob;
  fileName: string;
}

export async function fetchNotesList(
  importId: string,
  { q, limit, offset }: NoteListQuery = {}
): Promise<NoteListResponse> {
  const params = new URLSearchParams();
  if (q != null && q.length > 0) {
    params.set('q', q);
  }
  if (typeof limit === 'number') {
    params.set('limit', limit.toString());
  }
  if (typeof offset === 'number') {
    params.set('offset', offset.toString());
  }

  const queryString = params.toString();
  const url = queryString
    ? `/api/imports/${importId}/notes?${queryString}`
    : `/api/imports/${importId}/notes`;

  const res = await fetch(url);
  await ensureOk(res);
  return (await res.json()) as NoteListResponse;
}

export async function fetchNoteDetail(importId: string, noteId: string): Promise<NoteDetail> {
  const res = await fetch(`/api/imports/${importId}/notes/${noteId}`);

  await ensureOk(res);
  return (await res.json()) as NoteDetail;
}

export async function bulkDownloadResources(
  importId: string,
  resources: BulkDownloadResource[]
): Promise<BulkDownloadResponse> {
  const response = await fetch(`/api/imports/${importId}/resources/bulk-download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ resources })
  });
  await ensureOk(response);

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const fileNameMatch = /filename="?([^";]+)"?/i.exec(disposition);

  return {
    blob: await response.blob(),
    fileName: fileNameMatch?.[1] ?? `import-${importId}-resources.zip`
  };
}
