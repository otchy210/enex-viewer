import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseEnexFile } from './enex';

describe('parseEnexFile', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('uploads the file and returns the parsed response', async () => {
    const responseBody = {
      importId: 'import-1',
      noteCount: 2,
      warnings: []
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(responseBody), { status: 200 }));
    globalThis.fetch = fetchMock;

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });

    await expect(parseEnexFile(file)).resolves.toEqual(responseBody);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/enex/parse',
      expect.objectContaining({ method: 'POST' })
    );

    const call = fetchMock.mock.calls[0] as
      | [RequestInfo | URL, RequestInit | undefined]
      | undefined;
    const request = call?.[1];
    expect(request?.body).toBeInstanceOf(FormData);
    const body = request?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
  });

  it('prefers the API error message when available', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Invalid ENEX' }), { status: 400 })
      );
    globalThis.fetch = fetchMock;

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });

    await expect(parseEnexFile(file)).rejects.toThrow('Invalid ENEX');
  });

  it('falls back to the HTTP status when the error payload is unreadable', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('not-json', { status: 500 }));
    globalThis.fetch = fetchMock;

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });

    await expect(parseEnexFile(file)).rejects.toThrow('HTTP 500');
  });
});
