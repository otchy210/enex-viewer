import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../features/notes/NoteDetailPanel', () => ({
  NoteDetailPanel: ({ noteId }: { noteId: string | null }) => (
    <div data-testid="note-detail-panel">{noteId ?? 'none'}</div>
  )
}));

import { HomePage } from './HomePage';
import { lookupImportByHash, parseEnexFile } from '../api/enex';
import { fetchNotesList } from '../api/notes';
import { computeFileSha256 } from '../lib/hashFile';

vi.mock('../api/enex', () => ({
  parseEnexFile: vi.fn(),
  lookupImportByHash: vi.fn()
}));

vi.mock('../lib/hashFile', () => ({
  computeFileSha256: vi.fn()
}));

vi.mock('../api/notes', async () => {
  const actual = await vi.importActual('../api/notes');

  return {
    ...actual,
    fetchNotesList: vi.fn()
  };
});

const mockedParseEnexFile = vi.mocked(parseEnexFile);
const mockedLookupImportByHash = vi.mocked(lookupImportByHash);
const mockedComputeFileSha256 = vi.mocked(computeFileSha256);
const mockedFetchNotesList = vi.mocked(fetchNotesList);

const setupUploadReadyState = () => {
  mockedComputeFileSha256.mockResolvedValue('a'.repeat(64));
  mockedLookupImportByHash.mockResolvedValue({
    hash: 'a'.repeat(64),
    importId: null,
    shouldUpload: true,
    message: 'No import found for the hash. Continue with POST /api/enex/parse.'
  });
};

describe('HomePage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockedParseEnexFile.mockReset();
    mockedLookupImportByHash.mockReset();
    mockedComputeFileSha256.mockReset();
    mockedFetchNotesList.mockReset();
    mockedFetchNotesList.mockResolvedValue({ total: 0, notes: [] });
  });

  it('renders the ENEX viewer heading', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'ENEX Viewer' })).toBeInTheDocument();
  });

  it('updates notes limit via UI and requests the list with updated query', async () => {
    setupUploadReadyState();
    mockedParseEnexFile.mockResolvedValue({
      importId: 'import-1',
      noteCount: 3,
      warnings: []
    });

    render(<HomePage />);

    const file = new File(['dummy'], 'small.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);
    await screen.findByRole('button', { name: 'Upload' });
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenCalledWith('import-1', {
        q: undefined,
        limit: 20,
        offset: 0
      });
    });

    expect(await screen.findByText('No notes found for this import.')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Per page'), '50');

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-1', {
        q: undefined,
        limit: 50,
        offset: 0
      });
    });
  });

  it('resets query and offset when search input is cleared', async () => {
    setupUploadReadyState();
    mockedParseEnexFile.mockResolvedValue({
      importId: 'import-1',
      noteCount: 120,
      warnings: []
    });
    mockedFetchNotesList.mockResolvedValue({
      total: 120,
      notes: [
        {
          id: 'note-1',
          title: 'Sample Note',
          excerpt: 'Hello world',
          tags: [],
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]
    });

    render(<HomePage />);

    const file = new File(['dummy'], 'small.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);
    await userEvent.click(await screen.findByRole('button', { name: 'Upload' }));

    const searchInput = await screen.findByPlaceholderText('Search title or content');
    await userEvent.type(searchInput, 'meeting');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-1', {
        q: 'meeting',
        limit: 20,
        offset: 0
      });
    });

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-1', {
        q: 'meeting',
        limit: 20,
        offset: 20
      });
    });

    await userEvent.clear(searchInput);

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-1', {
        q: undefined,
        limit: 20,
        offset: 0
      });
    });
  });

  it('keeps note selection in sync with paged list results', async () => {
    setupUploadReadyState();
    mockedParseEnexFile.mockResolvedValue({
      importId: 'import-1',
      noteCount: 40,
      warnings: []
    });

    mockedFetchNotesList.mockImplementation((_importId, params) => {
      if (params?.offset === 20) {
        return Promise.resolve({
          total: 40,
          notes: [
            {
              id: 'note-2',
              title: 'Second page note',
              excerpt: 'Another note',
              tags: [],
              createdAt: '2024-01-02T00:00:00Z'
            }
          ]
        });
      }

      return Promise.resolve({
        total: 40,
        notes: [
          {
            id: 'note-1',
            title: 'First page note',
            excerpt: 'First note excerpt',
            tags: [],
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      });
    });

    render(<HomePage />);

    const file = new File(['dummy'], 'small.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);
    await userEvent.click(await screen.findByRole('button', { name: 'Upload' }));

    const firstNoteButton = await screen.findByRole('button', { name: /First page note/ });
    await userEvent.click(firstNoteButton);

    await waitFor(() => {
      expect(screen.getByTestId('note-detail-panel')).toHaveTextContent('note-1');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('button', { name: /Second page note/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('note-detail-panel')).toHaveTextContent('none');
    });
  });
});
