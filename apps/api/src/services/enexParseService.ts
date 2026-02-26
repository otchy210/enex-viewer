import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

import { parseEnex, parseEnexFileByNote } from './enexParserService.js';
import { buildNoteListIndex } from './noteListIndex.js';
import { resolveDataDirectory } from '../config/dataDirectory.js';
import {
  checkpointImportDatabaseWal,
  deleteImportSessionById,
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

export type EnexParsePayload = { hash: string } & ({ data: Buffer } | { filePath: string });

const resolvePayloadData = (payload: EnexParsePayload): Buffer =>
  'data' in payload ? payload.data : readFileSync(payload.filePath);

export const parseEnexFile = (payload: EnexParsePayload): EnexParseResult => {
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

  const importId = randomUUID();
  const warnings: string[] = [];
  const createdAt = new Date().toISOString();
  const resourcesDirectory = path.join(resolveDataDirectory(), 'resources');
  if (!existsSync(resourcesDirectory)) {
    mkdirSync(resourcesDirectory, { recursive: true });
  }

  const createdResourcePaths = new Set<string>();
  let noteCount = 0;

  const persistNote = (note: NoteDetail): void => {
    const [noteListEntry] = buildNoteListIndex([note]);
    if (noteListEntry === undefined) {
      return;
    }

    noteCount += 1;
    saveImportSession({
      id: importId,
      hash: payload.hash,
      createdAt,
      noteCount,
      warnings,
      notes: [note],
      noteListIndex: [
        {
          noteId: noteListEntry.note.id,
          title: noteListEntry.note.title,
          createdAt: noteListEntry.note.createdAt,
          updatedAt: noteListEntry.note.updatedAt,
          tags: noteListEntry.note.tags,
          searchText: noteListEntry.searchText,
          excerpt: noteListEntry.excerpt,
          sortKey: noteListEntry.sortKey
        }
      ]
    });
  };

  const mapResourceData = (data: Buffer): { hash: string; storagePath: string } => {
    const hash = createHash('sha256').update(data).digest('hex');
    const storagePath = path.join(resourcesDirectory, hash);
    if (!existsSync(storagePath)) {
      writeFileSync(storagePath, data);
      createdResourcePaths.add(storagePath);
    }

    return { hash, storagePath };
  };

  try {
    if ('filePath' in payload) {
      const streamResult = parseEnexFileByNote(payload.filePath, (note) => {
        const mappedNote: NoteDetail = {
          id: note.id,
          title: note.title,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          tags: note.tags,
          contentHtml: note.content,
          resources: note.resources
            .filter(hasBinaryData)
            .map((resource) => {
              const mappedResource = mapResourceData(resource.data);

              return {
                id: resource.id,
                fileName: resource.fileName,
                mime: resource.mime,
                size: resource.size,
                hash: mappedResource.hash,
                storagePath: mappedResource.storagePath
              };
            })
        };

        persistNote(mappedNote);
      });

      if (!streamResult.ok) {
        throw new EnexParseError(
          streamResult.error.code,
          streamResult.error.message,
          streamResult.error.details
        );
      }

      warnings.push(...streamResult.warnings.map(formatWarning));
    } else {
      const parsed = parseEnex(resolvePayloadData(payload));
      if (!parsed.ok) {
        throw new EnexParseError(parsed.error.code, parsed.error.message, parsed.error.details);
      }

      warnings.push(...parsed.warnings.map(formatWarning));

      parsed.notes.forEach((note) => {
        const mappedNote: NoteDetail = {
          id: note.id,
          title: note.title,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          tags: note.tags,
          contentHtml: note.content,
          resources: note.resources
            .filter(hasBinaryData)
            .map((resource) => {
              const mappedResource = mapResourceData(resource.data);

              return {
                id: resource.id,
                fileName: resource.fileName,
                mime: resource.mime,
                size: resource.size,
                hash: mappedResource.hash,
                storagePath: mappedResource.storagePath
              };
            })
        };

        persistNote(mappedNote);
      });
    }

    const savedImportId = saveImportSession({
      id: importId,
      hash: payload.hash,
      createdAt,
      noteCount,
      warnings,
      notes: [],
      noteListIndex: []
    } satisfies ImportSession);
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
      noteCount,
      warnings
    };
  } catch (error) {
    if (noteCount > 0) {
      deleteImportSessionById(importId);
      for (const createdResourcePath of createdResourcePaths) {
        rmSync(createdResourcePath, { force: true });
      }
    }
    throw error;
  }
};
