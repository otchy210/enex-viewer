import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import { parseEnex } from './enexParserService.js';
import { buildNoteListIndex } from './noteListIndex.js';
import { resolveDataDirectory } from '../config/dataDirectory.js';
import {
  checkpointImportDatabaseWal,
  findImportIdByHash,
  getImportSession,
  saveImportSession
} from '../repositories/importSessionRepository.js';

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

const hasBinaryData = <T extends { data?: Buffer }>(resource: T): resource is T & { data: Buffer } =>
  resource.data !== undefined && resource.data.length > 0;

export const parseEnexFile = (payload: { data: Buffer; hash: string }): EnexParseResult => {
  const existingImportId = findImportIdByHash(payload.hash);
  if (existingImportId !== undefined) {
    const existingSession = getImportSession(existingImportId);
    if (existingSession !== undefined) {
      checkpointImportDatabaseWal();
      return {
        importId: existingSession.id,
        hash: existingSession.hash,
        noteCount: existingSession.noteCount,
        warnings: existingSession.warnings
      };
    }
  }

  const parsed = parseEnex(payload.data);
  if (!parsed.ok) {
    throw new EnexParseError(parsed.error.code, parsed.error.message, parsed.error.details);
  }

  const warnings = parsed.warnings.map(formatWarning);
  const importId = randomUUID();
  const resourcesDirectory = path.join(resolveDataDirectory(), 'resources');
  if (!existsSync(resourcesDirectory)) {
    mkdirSync(resourcesDirectory, { recursive: true });
  }

  const notes: NoteDetail[] = parsed.notes.map((note) => ({
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.tags,
    contentHtml: note.content,
    resources: note.resources
      .filter(hasBinaryData)
      .map((resource) => {
        const hash = createHash('sha256').update(resource.data).digest('hex');
        const storagePath = path.join(resourcesDirectory, hash);
        if (!existsSync(storagePath)) {
          writeFileSync(storagePath, resource.data);
        }

        return {
          id: resource.id,
          fileName: resource.fileName,
          mime: resource.mime,
          size: resource.size,
          hash,
          storagePath
        };
      })
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

  const savedImportId = saveImportSession(session);
  checkpointImportDatabaseWal();

  if (savedImportId !== importId) {
    const existingSession = getImportSession(savedImportId);
    if (existingSession !== undefined) {
      return {
        importId: existingSession.id,
        hash: existingSession.hash,
        noteCount: existingSession.noteCount,
        warnings: existingSession.warnings
      };
    }
  }

  return {
    importId: savedImportId,
    hash: payload.hash,
    noteCount: notes.length,
    warnings
  };
};
