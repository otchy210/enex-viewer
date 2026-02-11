import { beforeEach, describe, expect, it } from 'vitest';

import { clearImports, saveImport } from '../repositories/importRepository.js';
import { listNotes } from './noteListService.js';

describe('listNotes', () => {
  beforeEach(() => {
    clearImports();
  });

  it('returns null for unknown imports', () => {
    expect(listNotes('missing', { q: undefined, limit: 10, offset: 0 })).toBeNull();
  });

  it('filters with trimmed, case-insensitive queries', () => {
    saveImport('import-1', [
      {
        id: 'note-1',
        title: 'Coffee Log',
        createdAt: '20240101T000000Z',
        updatedAt: '20240102T000000Z',
        tags: ['Kitchen'],
        content: '<en-note>Beans</en-note>'
      },
      {
        id: 'note-2',
        title: 'Travel Plan',
        createdAt: '20240103T000000Z',
        updatedAt: '20240104T000000Z',
        tags: ['travel'],
        content: '<en-note>Tokyo</en-note>'
      }
    ]);

    const result = listNotes('import-1', { q: '  coffee  ', limit: 10, offset: 0 });

    expect(result?.total).toBe(1);
    expect(result?.notes[0]?.id).toBe('note-1');
  });

  it('builds excerpts by stripping markup and truncating', () => {
    saveImport('import-2', [
      {
        id: 'note-1',
        title: 'Long Note',
        createdAt: '20240101T000000Z',
        updatedAt: '20240102T000000Z',
        tags: [],
        content: '<en-note><p>' + 'A'.repeat(140) + '</p><p>extra</p></en-note>'
      }
    ]);

    const result = listNotes('import-2', { q: undefined, limit: 10, offset: 0 });

    expect(result?.notes[0]?.excerpt).toBe('A'.repeat(120) + '...');
  });

  it('sorts by most recent updated/created timestamps', () => {
    saveImport('import-3', [
      {
        id: 'note-older',
        title: 'Older',
        createdAt: '20240101T000000Z',
        updatedAt: '20240102T000000Z',
        tags: [],
        content: '<en-note>old</en-note>'
      },
      {
        id: 'note-newer',
        title: 'Newer',
        createdAt: '20240105T000000Z',
        updatedAt: undefined,
        tags: [],
        content: '<en-note>new</en-note>'
      }
    ]);

    const result = listNotes('import-3', { q: undefined, limit: 10, offset: 0 });

    expect(result?.notes[0]?.id).toBe('note-newer');
  });
});
