import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchNoteDetail, fetchNotesList } from './notes';

describe('notes api', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches the notes list with query params', async () => {
    const payload = { total: 1, notes: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    globalThis.fetch = fetchMock;

    await expect(
      fetchNotesList('import-1', { q: 'hello', limit: 10, offset: 20 })
    ).resolves.toEqual(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/imports/import-1/notes?q=hello&limit=10&offset=20'
    );
  });

  it('fetches the notes list without query params', async () => {
    const payload = { total: 0, notes: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    globalThis.fetch = fetchMock;

    await expect(fetchNotesList('import-2')).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('/api/imports/import-2/notes');
  });

  it('throws when the notes list request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Bad request' }), { status: 400 })
      );
    globalThis.fetch = fetchMock;

    await expect(fetchNotesList('import-3')).rejects.toThrow('Bad request');
  });

  it('fetches note detail by id', async () => {
    const payload = {
      id: 'note-1',
      title: 'Sample',
      tags: [],
      contentHtml: '<p>Content</p>',
      resources: []
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    globalThis.fetch = fetchMock;

    await expect(fetchNoteDetail('import-1', 'note-1')).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('/api/imports/import-1/notes/note-1');
  });

  it('throws when the note detail request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('not-json', { status: 500 }));
    globalThis.fetch = fetchMock;

    await expect(fetchNoteDetail('import-1', 'note-2')).rejects.toThrow('HTTP 500');
  });
});
