import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { resolveDataDirectory, resolveSqlitePath } from '../config/dataDirectory.js';

import type { ImportSession } from '../models/note.js';

const quoteSql = (value: string): string => `'${value.replaceAll("'", "''")}'`;
const nullableSql = (value: string | null | undefined): string =>
  value === null || value === undefined ? 'NULL' : quoteSql(value);

let initializedDbPath: string | null = null;

const ensureDirectories = (): void => {
  const dataDirectory = resolveDataDirectory();
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.mkdirSync(path.join(dataDirectory, 'resources'), { recursive: true });
};

const executeSql = (args: string[]): string => execFileSync('sqlite3', args, { encoding: 'utf8' });

const ensureSchema = (): string => {
  ensureDirectories();
  const dbPath = resolveSqlitePath();
  if (initializedDbPath === dbPath) {
    return dbPath;
  }

  executeSql([
    dbPath,
    `
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
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
  `
  ]);
  initializedDbPath = dbPath;
  return dbPath;
};

const sqlite = (sql: string): string => executeSql([ensureSchema(), sql]);

const sqliteJson = <T>(sql: string): T[] => {
  const output = executeSql(['-json', ensureSchema(), sql]).trim();
  if (output.length === 0) {
    return [];
  }

  return JSON.parse(output) as T[];
};

export const saveImportSession = (session: ImportSession): void => {
  const statements: string[] = [
    'BEGIN TRANSACTION;',
    `INSERT INTO imports (id, hash, created_at, note_count, warnings_json) VALUES (${quoteSql(
      session.id
    )}, ${quoteSql(session.hash)}, ${quoteSql(session.createdAt)}, ${session.noteCount}, ${quoteSql(
      JSON.stringify(session.warnings)
    )});`
  ];

  const notesById = new Map(session.notes.map((note) => [note.id, note]));
  for (const noteIndex of session.noteListIndex) {
    const note = notesById.get(noteIndex.noteId);
    if (note === undefined) {
      continue;
    }

    statements.push(
      `INSERT INTO notes (id, import_id, title, created_at, updated_at, tags_json, excerpt, content_html, search_text, sort_key) VALUES (${quoteSql(
        note.id
      )}, ${quoteSql(session.id)}, ${quoteSql(note.title)}, ${nullableSql(
        note.createdAt
      )}, ${nullableSql(note.updatedAt)}, ${quoteSql(JSON.stringify(note.tags))}, ${quoteSql(
        noteIndex.excerpt
      )}, ${quoteSql(note.contentHtml)}, ${quoteSql(noteIndex.searchText)}, ${noteIndex.sortKey});`
    );

    for (const resource of note.resources) {
      statements.push(
        `INSERT INTO resources (id, note_id, import_id, file_name, mime, size, hash, storage_path) VALUES (${quoteSql(
          resource.id
        )}, ${quoteSql(note.id)}, ${quoteSql(session.id)}, ${nullableSql(
          resource.fileName
        )}, ${nullableSql(resource.mime)}, ${resource.size ?? 'NULL'}, NULL, NULL);`
      );
    }
  }

  statements.push('COMMIT;');
  sqlite(statements.join('\n'));
};

export const getImportSession = (importId: string): ImportSession | undefined => {
  const imports = sqliteJson<{
    id: string;
    hash: string;
    created_at: string;
    note_count: number;
    warnings_json: string;
  }>(`SELECT id, hash, created_at, note_count, warnings_json FROM imports WHERE id = ${quoteSql(importId)};`);

  const importRow = imports[0];
  if (importRow === undefined) {
    return undefined;
  }

  const notes = sqliteJson<{
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
    tags_json: string;
    excerpt: string;
    content_html: string;
    search_text: string;
    sort_key: number;
  }>(
    `SELECT id, title, created_at, updated_at, tags_json, excerpt, content_html, search_text, sort_key FROM notes WHERE import_id = ${quoteSql(
      importId
    )} ORDER BY sort_key DESC;`
  );

  const resources = sqliteJson<{
    id: string;
    note_id: string;
    file_name?: string;
    mime?: string;
    size?: number;
  }>(`SELECT id, note_id, file_name, mime, size FROM resources WHERE import_id = ${quoteSql(importId)};`);

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
  sqlite('DELETE FROM resources; DELETE FROM notes; DELETE FROM imports;');
};

export const getDatabasePath = (): string => {
  ensureSchema();
  return resolveSqlitePath();
};
