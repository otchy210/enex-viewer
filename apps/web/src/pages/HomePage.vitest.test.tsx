import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';
import { fetchMessage, type ApiResponse } from '../api/message';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

vi.mock('../api/message', () => ({
  fetchMessage: vi.fn()
}));

const mockedFetchMessage = vi.mocked(fetchMessage);

describe('HomePage', () => {
  beforeEach(() => {
    mockedFetchMessage.mockReset();
  });

  it('renders the heading and shows loading state initially', async () => {
    const deferred = createDeferred<ApiResponse>();
    mockedFetchMessage.mockReturnValueOnce(deferred.promise);

    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: 'TypeScript REST API + Web UI' })
    ).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    deferred.resolve({ message: 'Hello', timestamp: '2024-01-01' });
    await deferred.promise;
  });

  it('renders the API response when fetch succeeds', async () => {
    mockedFetchMessage.mockResolvedValueOnce({
      message: 'Hello from API',
      timestamp: '2024-01-02'
    });

    render(<HomePage />);

    expect(await screen.findByText('Hello from API')).toBeInTheDocument();
    expect(screen.getByText('2024-01-02')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders an error message when fetch fails', async () => {
    mockedFetchMessage.mockRejectedValueOnce(new Error('Boom'));

    render(<HomePage />);

    expect(await screen.findByText('Error: Boom')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
