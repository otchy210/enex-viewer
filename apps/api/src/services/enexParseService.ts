import { randomUUID } from 'crypto';

import { saveImport } from '../repositories/importRepository.js';
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
  const result = parseEnex(payload.data);
  if (!result.ok) {
    throw new EnexParseError(result.error.code, result.error.message, result.error.details);
  }

  const importId = randomUUID();
  saveImport(
    importId,
    result.notes.map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      content: note.content
    }))
  );

  return {
    importId,
    noteCount: result.notes.length,
    warnings: result.warnings.map(formatWarning)
  };
};
