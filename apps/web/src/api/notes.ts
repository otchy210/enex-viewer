import { buildErrorMessage } from './error';

export type NoteSummary = {
  id: string;
  title: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  tags: string[];
  excerpt: string;
};

export type NoteListResponse = {
  total: number;
  notes: NoteSummary[];
};

export type NoteListQuery = {
  q?: string;
  limit?: number;
  offset?: number;
};

export async function fetchNotesList(
  importId: string,
  { q, limit, offset }: NoteListQuery
): Promise<NoteListResponse> {
  const params = new URLSearchParams();
  if (q) {
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
  if (!res.ok) {
    throw new Error(await buildErrorMessage(res));
  }

  return (await res.json()) as NoteListResponse;
}
