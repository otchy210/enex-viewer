import type { ImportSession } from '../models/note.js';
import { clearImportSessions, getImportSession, saveImportSession } from './importSessionRepository.js';

export type StoredNote = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  content: string;
};

type StoredImport = {
  importId: string;
  notes: StoredNote[];
};

export const saveImport = (importId: string, notes: StoredNote[]): void => {
  const session: ImportSession = {
    id: importId,
    createdAt: new Date().toISOString(),
    noteCount: notes.length,
    warnings: [],
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      contentHtml: note.content,
      resources: []
    }))
  };

  saveImportSession(session);
};

export const getImport = (importId: string): StoredImport | undefined => {
  const session = getImportSession(importId);
  if (!session) {
    return undefined;
  }

  return {
    importId: session.id,
    notes: session.notes.map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      content: note.contentHtml
    }))
  };
};

export const clearImports = (): void => {
  clearImportSessions();
};
