import { getImport } from '../repositories/importRepository.js';

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

const stripMarkup = (value: string): string => {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const buildExcerpt = (content: string, maxLength = 120): string => {
  const plain = stripMarkup(content);
  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength).trim()}...`;
};

const toTimestamp = (value?: string): number => {
  if (!value) {
    return 0;
  }
  const evernoteMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (evernoteMatch) {
    const [, year, month, day, hour, minute, second] = evernoteMatch;
    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const listNotes = (importId: string, query: NoteListQuery): NoteListResult | null => {
  const storedImport = getImport(importId);
  if (!storedImport) {
    return null;
  }

  const normalized = normalizeQuery(query.q);
  const filtered = normalized
    ? storedImport.notes.filter((note) => {
        const haystack = [note.title, note.content, note.tags.join(' ')].join(' ').toLowerCase();
        return haystack.includes(normalized);
      })
    : storedImport.notes;

  const sorted = [...filtered].sort((left, right) => {
    const leftTime = toTimestamp(left.updatedAt ?? left.createdAt);
    const rightTime = toTimestamp(right.updatedAt ?? right.createdAt);
    return rightTime - leftTime;
  });
  const total = sorted.length;
  const sliced = sorted.slice(query.offset, query.offset + query.limit);

  return {
    total,
    notes: sliced.map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      excerpt: buildExcerpt(note.content)
    }))
  };
};
