import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotesListSection } from './NotesListSection';
import { fetchNotesList, type NoteListResponse } from '../../api/notes';
import { createDeferred } from '../../test-utils/deferred';

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

describe('NotesListSection', () => {
  afterEach(() => {
    cleanup();
  });

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

  it('supports pagination for larger result sets', async () => {
    mockedFetchNotesList.mockResolvedValueOnce(
      createResponse({
        total: 25
      })
    );
    mockedFetchNotesList.mockResolvedValueOnce(
      createResponse({
        total: 25,
        notes: [
          {
            id: 'note-2',
            title: 'Page 2 Note',
            excerpt: 'Next page',
            tags: [],
            createdAt: null,
            updatedAt: null
          }
        ]
      })
    );

    render(<NotesListSection importId="import-777" />);

    expect(await screen.findByText('Sample Note')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-777', {
        q: undefined,
        limit: 20,
        offset: 20
      });
    });

    expect(await screen.findByText('Page 2 Note')).toBeInTheDocument();
  });

  it('clears the search query and reloads the list', async () => {
    mockedFetchNotesList.mockResolvedValueOnce(createResponse());
    mockedFetchNotesList.mockResolvedValueOnce(createResponse({ total: 0, notes: [] }));
    mockedFetchNotesList.mockResolvedValueOnce(createResponse());

    render(<NotesListSection importId="import-555" />);

    expect(await screen.findByText('Sample Note')).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText('Search title or content'),
      'draft'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-555', {
        q: 'draft',
        limit: 20,
        offset: 0
      });
    });

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(mockedFetchNotesList).toHaveBeenLastCalledWith('import-555', {
        q: undefined,
        limit: 20,
        offset: 0
      });
    });
  });

  it('clears previous notes while refetching for a new import', async () => {
    const deferred = createDeferred<NoteListResponse>();
    mockedFetchNotesList
      .mockResolvedValueOnce(createResponse())
      .mockReturnValueOnce(deferred.promise);

    const { rerender } = render(<NotesListSection importId="import-1" />);

    expect(await screen.findByText('Sample Note')).toBeInTheDocument();

    rerender(<NotesListSection importId="import-2" />);

    await waitFor(() => {
      expect(screen.queryByText('Sample Note')).not.toBeInTheDocument();
    });
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
