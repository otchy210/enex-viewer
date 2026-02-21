import { getImportSession } from '../repositories/importSessionRepository.js';

import type { NoteDetail } from '../models/note.js';

export interface NoteDetailError {
  code: 'IMPORT_NOT_FOUND' | 'NOTE_NOT_FOUND';
  message: string;
}

export type NoteDetailResult =
  | { ok: true; note: NoteDetail }
  | { ok: false; error: NoteDetailError };

export const fetchNoteDetail = (importId: string, noteId: string): NoteDetailResult => {
  const session = getImportSession(importId);
  if (!session) {
    return {
      ok: false,
      error: {
        code: 'IMPORT_NOT_FOUND',
        message: 'Import session not found.'
      }
    };
  }

  const note = session.notes.find((entry) => entry.id === noteId);
  if (!note) {
    return {
      ok: false,
      error: {
        code: 'NOTE_NOT_FOUND',
        message: 'Note not found.'
      }
    };
  }

  return {
    ok: true,
    note: {
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      contentHtml: note.contentHtml,
      resources: note.resources.map((resource) => ({
        id: resource.id,
        fileName: resource.fileName,
        mime: resource.mime,
        size: resource.size
      }))
    }
  };
};
