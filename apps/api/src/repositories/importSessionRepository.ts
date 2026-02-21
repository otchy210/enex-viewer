import { existsSync, mkdirSync } from 'fs';
import path from 'path';

import Database from 'better-sqlite3';

import { resolveDataDirectory, resolveSqlitePath } from '../config/dataDirectory.js';

import type { ImportSession } from '../models/note.js';

const ensureDirectories = (): void => {
  const dataDirectory = resolveDataDirectory();
  if (!existsSync(dataDirectory)) {
    mkdirSync(dataDirectory, { recursive: true });
  }
  const resourcesDir = path.join(dataDirectory, 'resources');
  if (!existsSync(resourcesDir)) {
    mkdirSync(resourcesDir, { recursive: true });
  }
};

interface SqliteDatabase {
  pragma: <T = unknown>(value: string) => T;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number };
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
  transaction: <T>(fn: () => T) => () => T;
  close: () => void;
}

let db: SqliteDatabase | null = null;

const getDb = (): SqliteDatabase => {
  if (db != null) {
    return db;
  }
  ensureDirectories();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  db = new Database(resolveSqlitePath()) as SqliteDatabase;
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      note_count INTEGER NOT NULL,
      warnings_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT NOT NULL,
      import_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      tags_json TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content_html TEXT NOT NULL,
      search_text TEXT NOT NULL,
      sort_key INTEGER NOT NULL,
      PRIMARY KEY (id, import_id),
      FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      import_id TEXT NOT NULL,
      file_name TEXT,
      mime TEXT,
      size INTEGER,
      hash TEXT,
      storage_path TEXT,
      FOREIGN KEY (note_id, import_id) REFERENCES notes(id, import_id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_imports_hash ON imports(hash);
    CREATE INDEX IF NOT EXISTS idx_notes_import ON notes(import_id);
    CREATE INDEX IF NOT EXISTS idx_notes_import_sort ON notes(import_id, sort_key DESC);
    CREATE INDEX IF NOT EXISTS idx_resources_import ON resources(import_id);
    CREATE INDEX IF NOT EXISTS idx_resources_note ON resources(note_id, import_id);
  `);
  return db;
};

export const findImportIdByHash = (hash: string): string | undefined => {
  const database = getDb();
  const row = database.prepare('SELECT id FROM imports WHERE hash = ?').get(hash) as
    | { id: string }
    | undefined;
  return row?.id;
};

export const saveImportSession = (session: ImportSession): string => {
  const database = getDb();
  const insertImport = database.prepare(
    'INSERT OR IGNORE INTO imports (id, hash, created_at, note_count, warnings_json) VALUES (?, ?, ?, ?, ?)'
  );
  const insertNote = database.prepare(
    'INSERT INTO notes (id, import_id, title, created_at, updated_at, tags_json, excerpt, content_html, search_text, sort_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertResource = database.prepare(
    'INSERT INTO resources (id, note_id, import_id, file_name, mime, size, hash, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const run = database.transaction((): string => {
    const importInsertResult = insertImport.run(
      session.id,
      session.hash,
      session.createdAt,
      session.noteCount,
      JSON.stringify(session.warnings)
    );

    if (importInsertResult.changes === 0) {
      const existingImportId = findImportIdByHash(session.hash);
      if (existingImportId === undefined) {
        throw new Error(`Import session already exists for hash ${session.hash}, but id could not be resolved.`);
      }
      return existingImportId;
    }

    const notesById = new Map(session.notes.map((note) => [note.id, note]));
    for (const noteIndex of session.noteListIndex) {
      const note = notesById.get(noteIndex.noteId);
      if (note === undefined) {
        continue;
      }

      insertNote.run(
        note.id,
        session.id,
        note.title,
        note.createdAt ?? null,
        note.updatedAt ?? null,
        JSON.stringify(note.tags),
        noteIndex.excerpt,
        note.contentHtml,
        noteIndex.searchText,
        noteIndex.sortKey
      );

      for (const resource of note.resources) {
        insertResource.run(
          resource.id,
          note.id,
          session.id,
          resource.fileName ?? null,
          resource.mime ?? null,
          resource.size ?? null,
          resource.hash ?? null,
          resource.storagePath ?? null
        );
      }
    }

    return session.id;
  });

  return run();
};

export const getImportSession = (importId: string): ImportSession | undefined => {
  const database = getDb();
  const importRow = database
    .prepare('SELECT id, hash, created_at, note_count, warnings_json FROM imports WHERE id = ?')
    .get(importId) as
    | {
        id: string;
        hash: string;
        created_at: string;
        note_count: number;
        warnings_json: string;
      }
    | undefined;

  if (importRow === undefined) {
    return undefined;
  }

  const notes = database
    .prepare(
      'SELECT id, title, created_at, updated_at, tags_json, excerpt, content_html, search_text, sort_key FROM notes WHERE import_id = ? ORDER BY sort_key DESC'
    )
    .all(importId) as {
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
    tags_json: string;
    excerpt: string;
    content_html: string;
    search_text: string;
    sort_key: number;
  }[];

  const resources = database
    .prepare('SELECT id, note_id, file_name, mime, size, hash, storage_path FROM resources WHERE import_id = ?')
    .all(importId) as {
    id: string;
    note_id: string;
    file_name?: string | null;
    mime?: string | null;
    size?: number | null;
    hash?: string | null;
    storage_path?: string | null;
  }[];

  return {
    id: importRow.id,
    hash: importRow.hash,
    createdAt: importRow.created_at,
    noteCount: importRow.note_count,
    warnings: JSON.parse(importRow.warnings_json) as string[],
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      tags: JSON.parse(note.tags_json) as string[],
      contentHtml: note.content_html,
      resources: resources
        .filter((resource) => resource.note_id === note.id)
        .map((resource) => ({
          id: resource.id,
          fileName: resource.file_name ?? undefined,
          mime: resource.mime ?? undefined,
          size: resource.size ?? undefined,
          hash: resource.hash ?? undefined,
          storagePath: resource.storage_path ?? undefined
        }))
    })),
    noteListIndex: notes.map((note) => ({
      noteId: note.id,
      title: note.title,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      tags: JSON.parse(note.tags_json) as string[],
      searchText: note.search_text,
      excerpt: note.excerpt,
      sortKey: note.sort_key
    }))
  };
};

export const clearImportSessions = (): void => {
  const database = getDb();
  database.exec('DELETE FROM resources; DELETE FROM notes; DELETE FROM imports;');
};

export interface StoredResourceRow {
  id: string;
  noteId: string;
  fileName?: string;
  mime?: string;
  size?: number;
  hash?: string;
  storagePath?: string | null;
}

export const getStoredResource = (
  importId: string,
  noteId: string,
  resourceId: string
): StoredResourceRow | undefined => {
  const database = getDb();
  const row = database
    .prepare(
      'SELECT id, note_id, file_name, mime, size, hash, storage_path FROM resources WHERE import_id = ? AND note_id = ? AND id = ?'
    )
    .get(importId, noteId, resourceId) as
    | {
        id: string;
        note_id: string;
        file_name?: string | null;
        mime?: string | null;
        size?: number | null;
        hash?: string | null;
        storage_path?: string | null;
      }
    | undefined;

  if (row === undefined) {
    return undefined;
  }

  return {
    id: row.id,
    noteId: row.note_id,
    fileName: row.file_name ?? undefined,
    mime: row.mime ?? undefined,
    size: row.size ?? undefined,
    hash: row.hash ?? undefined,
    storagePath: row.storage_path ?? undefined
  };
};

export const listStoredResourcesByIds = (
  importId: string,
  requested: { noteId: string; resourceId: string }[]
): StoredResourceRow[] => {
  if (requested.length === 0) {
    return [];
  }

  const database = getDb();
  const selected = new Map(requested.map((item) => [`${item.noteId}:${item.resourceId}`, item]));

  const placeholders = requested.map(() => '(?, ?)').join(', ');
  const params = requested.flatMap((item) => [item.noteId, item.resourceId]);
  const rows = database
    .prepare(
      `SELECT id, note_id, file_name, mime, size, hash, storage_path
       FROM resources
       WHERE import_id = ? AND (note_id, id) IN (${placeholders})`
    )
    .all(importId, ...params) as {
    id: string;
    note_id: string;
    file_name?: string | null;
    mime?: string | null;
    size?: number | null;
    hash?: string | null;
    storage_path?: string | null;
  }[];

  return rows
    .filter((row) => selected.has(`${row.note_id}:${row.id}`))
    .map((row) => ({
      id: row.id,
      noteId: row.note_id,
      fileName: row.file_name ?? undefined,
      mime: row.mime ?? undefined,
      size: row.size ?? undefined,
      hash: row.hash ?? undefined,
      storagePath: row.storage_path ?? undefined
    }));
};


export const updateStoredResourceStoragePath = (
  importId: string,
  noteId: string,
  resourceId: string,
  storagePath: string | null
): void => {
  const database = getDb();
  database
    .prepare('UPDATE resources SET storage_path = ? WHERE import_id = ? AND note_id = ? AND id = ?')
    .run(storagePath, importId, noteId, resourceId);
};

export const countNullStoragePathsByImportId = (importId: string): number => {
  const database = getDb();
  const row = database
    .prepare('SELECT COUNT(*) AS count FROM resources WHERE import_id = ? AND storage_path IS NULL')
    .get(importId) as { count: number };

  return row.count;
};

export const getDatabasePath = (): string => {
  getDb();
  return resolveSqlitePath();
};

const shouldSkipWalCheckpoint = (): boolean =>
  process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

export const checkpointImportDatabaseWal = (): void => {
  if (shouldSkipWalCheckpoint()) {
    return;
  }

  const database = getDb();
  database.pragma('wal_checkpoint(TRUNCATE)');
};

export const resetImportSessionRepository = (): void => {
  if (db == null) {
    return;
  }

  db.close();
  db = null;
};
