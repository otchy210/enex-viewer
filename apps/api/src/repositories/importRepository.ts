import type { ImportSession } from '../models/note.js';
import { buildNoteListIndex } from '../services/noteListIndex.js';
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
  const sessionNotes = notes.map((note) => ({
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.tags,
    contentHtml: note.content,
    resources: []
  }));

  const session: ImportSession = {
    id: importId,
    createdAt: new Date().toISOString(),
    noteCount: notes.length,
    warnings: [],
    notes: sessionNotes,
    noteListIndex: buildNoteListIndex(sessionNotes).map((entry) => ({
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
