import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

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

let db: Database.Database | null = null;

const getDb = (): Database.Database => {
  if (db != null) {
    return db;
  }
  ensureDirectories();
  db = new Database(resolveSqlitePath());
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
    CREATE INDEX IF NOT EXISTS idx_notes_import_sort ON notes(import_id, sort_key DESC);
    CREATE INDEX IF NOT EXISTS idx_resources_note ON resources(note_id, import_id);
  `);
  return db;
};

export const saveImportSession = (session: ImportSession): void => {
  const database = getDb();
  const insertImport = database.prepare(
    'INSERT INTO imports (id, hash, created_at, note_count, warnings_json) VALUES (?, ?, ?, ?, ?)'
  );
  const insertNote = database.prepare(
    'INSERT INTO notes (id, import_id, title, created_at, updated_at, tags_json, excerpt, content_html, search_text, sort_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertResource = database.prepare(
    'INSERT INTO resources (id, note_id, import_id, file_name, mime, size, hash, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const run = database.transaction(() => {
    insertImport.run(
      session.id,
      session.hash,
      session.createdAt,
      session.noteCount,
      JSON.stringify(session.warnings)
    );

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
          null,
          null
        );
      }
    }
  });

  run();
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
    .all(importId) as Array<{
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
    tags_json: string;
    excerpt: string;
    content_html: string;
    search_text: string;
    sort_key: number;
  }>;

  const resources = database
    .prepare('SELECT id, note_id, file_name, mime, size, hash, storage_path FROM resources WHERE import_id = ?')
    .all(importId) as Array<{
    id: string;
    note_id: string;
    file_name?: string;
    mime?: string;
    size?: number;
    hash?: string;
    storage_path?: string;
  }>;

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
          fileName: resource.file_name,
          mime: resource.mime,
          size: resource.size
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

export const getDatabasePath = (): string => {
  getDb();
  return resolveSqlitePath();
};
