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
});
