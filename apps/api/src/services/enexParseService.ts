import { randomUUID } from 'crypto';

import { saveImport } from '../repositories/importRepository.js';
import type { ImportSession, NoteDetail } from '../models/note.js';
import { saveImportSession } from '../repositories/importSessionRepository.js';
import { parseEnex } from './enexParserService.js';

export type EnexParseResult = {
  importId: string;
  noteCount: number;
  warnings: string[];
};

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
  if (warning.noteTitle) {
    return `${warning.noteTitle}: ${warning.message}`;
  }
  return warning.message;
};

export const parseEnexFile = (payload: { data: Buffer }): EnexParseResult => {
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

  // Keep T-004 note list endpoint working.
  saveImport(
    importId,
    parsed.notes.map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      content: note.content
    }))
  );

  const session: ImportSession = {
    id: importId,
    createdAt: new Date().toISOString(),
    noteCount: notes.length,
    warnings,
    notes
  };

  saveImportSession(session);

  return {
    importId,
    noteCount: notes.length,
    warnings
  };
};
