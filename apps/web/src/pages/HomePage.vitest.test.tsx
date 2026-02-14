import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';
import { parseEnexFile } from '../api/enex';
import { fetchMessage, type ApiResponse } from '../api/message';
import { fetchNotesList } from '../api/notes';
import { createDeferred } from '../test-utils/deferred';

vi.mock('../api/message', () => ({
  fetchMessage: vi.fn()
}));

vi.mock('../api/enex', () => ({
  parseEnexFile: vi.fn()
}));

vi.mock('../api/notes', async () => {
  const actual = await vi.importActual('../api/notes');

  return {
    ...actual,
    fetchNotesList: vi.fn()
  };
});

const mockedFetchMessage = vi.mocked(fetchMessage);
const mockedParseEnexFile = vi.mocked(parseEnexFile);
const mockedFetchNotesList = vi.mocked(fetchNotesList);

describe('HomePage', () => {

  afterEach(() => {
    cleanup();
  });
  beforeEach(() => {
    mockedFetchMessage.mockReset();
    mockedParseEnexFile.mockReset();
    mockedFetchNotesList.mockReset();
    mockedFetchMessage.mockResolvedValue({ message: 'Hello', timestamp: '2024-01-01' });
    mockedFetchNotesList.mockResolvedValue({ total: 0, notes: [] });
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

  it('updates notes limit via UI and requests the list with updated query', async () => {
    mockedParseEnexFile.mockResolvedValue({
      importId: 'import-1',
      noteCount: 3,
      warnings: []
    });

    render(<HomePage />);

    const file = new File(['dummy'], 'small.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenCalledWith('import-1', {
        q: undefined,
        limit: 20,
        offset: 0
      });
    });

    await userEvent.selectOptions(screen.getByLabelText('Per page'), '50');

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-1', {
        q: undefined,
        limit: 50,
        offset: 0
      });
    });
  });
});
