import type { ImportSession } from '../models/note.js';

const importSessions = new Map<string, ImportSession>();

export const saveImportSession = (session: ImportSession) => {
  importSessions.set(session.id, session);
};

export const getImportSession = (importId: string): ImportSession | undefined =>
  importSessions.get(importId);

export const clearImportSessions = () => {
  importSessions.clear();
};
