import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NotesListSection } from './NotesListSection';
import { fetchNotesList, type NoteListResponse } from '../../api/notes';

vi.mock('../../api/notes', () => ({
  fetchNotesList: vi.fn()
}));

const mockedFetchNotesList = vi.mocked(fetchNotesList);

const createResponse = (overrides?: Partial<NoteListResponse>): NoteListResponse => ({
  total: 1,
  notes: [
    {
      id: 'note-1',
      title: 'Sample Note',
      excerpt: 'Hello world',
      tags: ['work'],
      createdAt: null,
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ],
  ...overrides
});

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

describe('NotesListSection', () => {
  it('renders a prompt when there is no import ID', () => {
    render(<NotesListSection importId={null} />);

    expect(
      screen.getByText('Upload an ENEX file to view notes.')
    ).toBeInTheDocument();
    expect(mockedFetchNotesList).not.toHaveBeenCalled();
  });

  it('fetches notes and supports searching', async () => {
    mockedFetchNotesList.mockResolvedValueOnce(createResponse());
    mockedFetchNotesList.mockResolvedValueOnce(
      createResponse({
        total: 0,
        notes: []
      })
    );

    render(<NotesListSection importId="import-123" />);

    expect(await screen.findByText('Sample Note')).toBeInTheDocument();
    expect(mockedFetchNotesList).toHaveBeenCalledWith('import-123', {
      q: undefined,
      limit: 20,
      offset: 0
    });

    await userEvent.type(
      screen.getByPlaceholderText('Search title or content'),
      'meeting'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-123', {
        q: 'meeting',
        limit: 20,
        offset: 0
      });
    });

    expect(await screen.findByText('No notes found.')).toBeInTheDocument();
  });

  it('shows error feedback when the API fails', async () => {
    mockedFetchNotesList.mockRejectedValueOnce(new Error('Network error'));

    render(<NotesListSection importId="import-999" />);

    expect(await screen.findByText('Error: Network error')).toBeInTheDocument();
  });

  it('clears previous notes while refetching for a new import', async () => {
    const deferred = createDeferred<NoteListResponse>();
    mockedFetchNotesList
      .mockResolvedValueOnce(createResponse())
      .mockReturnValueOnce(deferred.promise);

    const { rerender } = render(<NotesListSection importId="import-1" />);

    expect(await screen.findByText('Sample Note')).toBeInTheDocument();

    rerender(<NotesListSection importId="import-2" />);

    expect(screen.queryByText('Sample Note')).not.toBeInTheDocument();
    expect(screen.getByText('Loading notes...')).toBeInTheDocument();

    deferred.resolve(createResponse({
      notes: [
        {
          id: 'note-2',
          title: 'Next Import Note',
          excerpt: 'Fresh data',
          tags: [],
          createdAt: null,
          updatedAt: null
        }
      ]
    }));

    expect(await screen.findByText('Next Import Note')).toBeInTheDocument();
  });
});
