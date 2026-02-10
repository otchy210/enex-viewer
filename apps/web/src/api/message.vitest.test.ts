import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchMessage } from './message';

describe('fetchMessage', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns the message payload', async () => {
    const payload = { message: 'Hello', timestamp: '2024-01-01T00:00:00Z' };
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 })
    );
    globalThis.fetch = fetchMock;

    await expect(fetchMessage()).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('/api/message');
  });

  it('prefers the API error message when available', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Server unavailable' }), { status: 503 })
    );
    globalThis.fetch = fetchMock;

    await expect(fetchMessage()).rejects.toThrow('Server unavailable');
  });

  it('falls back to HTTP status when the error payload is unreadable', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('nope', { status: 500 }));
    globalThis.fetch = fetchMock;

    await expect(fetchMessage()).rejects.toThrow('HTTP 500');
  });
});
