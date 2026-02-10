import { getImportSession } from '../repositories/importSessionRepository.js';

export type NoteSummary = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  excerpt: string;
};

export type NoteListQuery = {
  q?: string;
  limit: number;
  offset: number;
};

export type NoteListResult = {
  total: number;
  notes: NoteSummary[];
};

const normalizeQuery = (value?: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
};

export const listNotes = (importId: string, query: NoteListQuery): NoteListResult | null => {
  const session = getImportSession(importId);
  if (!session) {
    return null;
  }

  const normalized = normalizeQuery(query.q);
  const filtered = normalized
    ? session.noteListIndex.filter((entry) => entry.searchText.includes(normalized))
    : session.noteListIndex;

  return {
    total: filtered.length,
    notes: filtered.slice(query.offset, query.offset + query.limit).map((entry) => ({
      id: entry.noteId,
      title: entry.title,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      tags: entry.tags,
      excerpt: entry.excerpt
    }))
  };
};
