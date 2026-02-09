import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoteBrowser } from './NoteBrowser';
import { fetchNotesList, type NoteListResponse } from '../../api/notes';
import { createDeferred } from '../../test-utils/deferred';

vi.mock('../../api/notes', () => ({
  fetchNotesList: vi.fn()
}));

vi.mock('./NoteDetailPanel', () => ({
  NoteDetailPanel: ({ noteId }: { noteId: string | null }) => (
    <div data-testid="detail-panel">{noteId ?? 'none'}</div>
  )
}));

const mockedFetchNotesList = vi.mocked(fetchNotesList);

describe('NoteBrowser', () => {
  beforeEach(() => {
    mockedFetchNotesList.mockReset();
  });

  it('shows a loading state while fetching', () => {
    const deferred = createDeferred<NoteListResponse>();
    mockedFetchNotesList.mockReturnValueOnce(deferred.promise);

    render(<NoteBrowser importId="import-1" />);

    expect(screen.getByText('Loading notes...')).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    mockedFetchNotesList.mockRejectedValueOnce(new Error('Network error'));

    render(<NoteBrowser importId="import-2" />);

    expect(await screen.findByText('Error: Network error')).toBeInTheDocument();
  });

  it('shows an empty state when there are no notes', async () => {
    mockedFetchNotesList.mockResolvedValueOnce({ total: 0, notes: [] });

    render(<NoteBrowser importId="import-3" />);

    expect(await screen.findByText('No notes found for this import.')).toBeInTheDocument();
  });

  it('renders notes and updates the selection', async () => {
    mockedFetchNotesList.mockResolvedValueOnce({
      total: 2,
      notes: [
        {
          id: 'note-1',
          title: 'First note',
          createdAt: '2024-01-01T00:00:00Z',
          tags: ['alpha'],
          excerpt: 'Excerpt one'
        },
        {
          id: 'note-2',
          title: 'Second note',
          updatedAt: 'invalid-date',
          tags: [],
          excerpt: 'Excerpt two'
        },
        {
          id: 'note-3',
          title: 'Third note',
          tags: [],
          excerpt: 'Excerpt three'
        }
      ]
    });

    render(<NoteBrowser importId="import-4" />);

    expect(await screen.findByText('First note')).toBeInTheDocument();
    expect(screen.getByText('Excerpt one')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('invalid-date')).toBeInTheDocument();
    expect(screen.getAllByText('—')[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /First note/ }));

    expect(screen.getByTestId('detail-panel')).toHaveTextContent('note-1');
    expect(screen.getByRole('button', { name: /First note/ })).toHaveClass('is-selected');
  });

  it('does not update state after unmount when the request fails', async () => {
    const deferred = createDeferred<NoteListResponse>();
    mockedFetchNotesList.mockReturnValueOnce(deferred.promise);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(<NoteBrowser importId="import-5" />);

    unmount();

    deferred.reject(new Error('Late failure'));

    await expect(deferred.promise).rejects.toThrow('Late failure');
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
