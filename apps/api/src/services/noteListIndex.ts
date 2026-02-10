import type { NoteDetail } from '../models/note.js';

export type NoteListIndexEntry = {
  note: NoteDetail;
  searchText: string;
  excerpt: string;
  sortKey: number;
};

const EVERNOTE_TIMESTAMP_PATTERN = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

const stripMarkup = (value: string): string => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const buildNoteExcerpt = (contentHtml: string, maxLength = 120): string => {
  const plain = stripMarkup(contentHtml);
  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trim()}...`;
};

const toTimestamp = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const evernoteMatch = EVERNOTE_TIMESTAMP_PATTERN.exec(value);
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

const buildSearchText = (note: NoteDetail): string =>
  `${note.title} ${note.contentHtml} ${note.tags.join(' ')}`.toLowerCase();

export const buildNoteListIndex = (notes: NoteDetail[]): NoteListIndexEntry[] => {
  return notes
    .map((note) => ({
      note,
      searchText: buildSearchText(note),
      excerpt: buildNoteExcerpt(note.contentHtml),
      sortKey: toTimestamp(note.updatedAt ?? note.createdAt)
    }))
    .sort((left, right) => right.sortKey - left.sortKey);
};
