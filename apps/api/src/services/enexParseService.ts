import { randomUUID } from 'crypto';

import { parseEnex } from './enexParserService.js';
import { buildNoteListIndex } from './noteListIndex.js';
import { saveImportSession } from '../repositories/importSessionRepository.js';

import type { ImportSession, NoteDetail } from '../models/note.js';

export interface EnexParseResult {
  importId: string;
  hash: string;
  noteCount: number;
  warnings: string[];
}

export class EnexParseError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const formatWarning = (warning: { noteTitle?: string; message: string }): string => {
  if (warning.noteTitle !== undefined && warning.noteTitle.length > 0) {
    return `${warning.noteTitle}: ${warning.message}`;
  }
  return warning.message;
};

export const parseEnexFile = (payload: { data: Buffer; hash: string }): EnexParseResult => {
  const parsed = parseEnex(payload.data);
  if (!parsed.ok) {
    throw new EnexParseError(parsed.error.code, parsed.error.message, parsed.error.details);
  }

  const warnings = parsed.warnings.map(formatWarning);
  const importId = randomUUID();
  const notes: NoteDetail[] = parsed.notes.map((note) => ({
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.tags,
    contentHtml: note.content,
    resources: note.resources.map((resource) => ({
      id: resource.id,
      fileName: resource.fileName,
      mime: resource.mime,
      size: resource.size
    }))
  }));

  const session: ImportSession = {
    id: importId,
    hash: payload.hash,
    createdAt: new Date().toISOString(),
    noteCount: notes.length,
    warnings,
    notes,
    noteListIndex: buildNoteListIndex(notes).map((entry) => ({
      noteId: entry.note.id,
      title: entry.note.title,
      createdAt: entry.note.createdAt,
      updatedAt: entry.note.updatedAt,
      tags: entry.note.tags,
      searchText: entry.searchText,
      excerpt: entry.excerpt,
      sortKey: entry.sortKey
    }))
  };

  saveImportSession(session);

  return {
    importId,
    hash: payload.hash,
    noteCount: notes.length,
    warnings
  };
};
