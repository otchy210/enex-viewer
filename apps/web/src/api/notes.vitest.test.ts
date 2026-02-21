import { afterEach, describe, expect, it, vi } from 'vitest';

import { bulkDownloadResources, fetchNoteDetail, fetchNotesList } from './notes';

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


  it('posts selected resources and returns zip blob metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response('zip-content', {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment; filename="bundle.zip"'
        }
      })
    );
    globalThis.fetch = fetchMock;

    const result = await bulkDownloadResources('import-1', [
      { noteId: 'note-1', resourceId: 'res-1' }
    ]);

    expect(fetchMock).toHaveBeenCalledWith('/api/imports/import-1/resources/bulk-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resources: [{ noteId: 'note-1', resourceId: 'res-1' }] })
    });
    expect(result.fileName).toBe('bundle.zip');
    expect(await result.blob.text()).toBe('zip-content');
  });

  it('falls back to default file name when content-disposition is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('zip-content', { status: 200 }));
    globalThis.fetch = fetchMock;

    await expect(
      bulkDownloadResources('import-99', [{ noteId: 'note-1', resourceId: 'res-1' }])
    ).resolves.toMatchObject({ fileName: 'import-import-99-resources.zip' });
  });
});
