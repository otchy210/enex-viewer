import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoteDetailPanel } from './NoteDetailPanel';
import { fetchNoteDetail, type NoteDetail } from '../../api/notes';
import { createDeferred } from '../../test-utils/deferred';

vi.mock('../../api/notes', () => ({
  fetchNoteDetail: vi.fn()
}));

const mockedFetchNoteDetail = vi.mocked(fetchNoteDetail);

describe('NoteDetailPanel', () => {
  beforeEach(() => {
    mockedFetchNoteDetail.mockReset();
  });

  it('shows a placeholder when no note is selected', () => {
    render(<NoteDetailPanel importId="import-1" noteId={null} />);

    expect(screen.getByText('Select a note to view details.')).toBeInTheDocument();
  });

  it('renders note details when the fetch succeeds', async () => {
    const deferred = createDeferred<NoteDetail>();
    mockedFetchNoteDetail.mockReturnValueOnce(deferred.promise);

    render(<NoteDetailPanel importId="import-1" noteId="note-1" />);

    expect(screen.getByText('Loading note details...')).toBeInTheDocument();

    deferred.resolve({
      id: 'note-1',
      title: 'Sample note',
      tags: ['demo'],
      contentHtml: '<p>Content</p>',
      createdAt: '20240101T010203Z',
      updatedAt: '20240102T030405Z',
      resources: [
        {
          id: 'resource-1',
          fileName: 'image.png',
          mime: 'image/png',
          size: 2048
        }
      ]
    });

    await deferred.promise;

    expect(await screen.findByRole('heading', { name: 'Sample note' })).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 01:02:03')).toBeInTheDocument();
    expect(screen.getByText('2024-01-02 03:04:05')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resources', level: 4 })).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Content', level: 4 })).toBeInTheDocument();
    expect(document.querySelector('.note-content')).toHaveTextContent('Content');
  });

  it('shows an error when the note is missing', async () => {
    mockedFetchNoteDetail.mockRejectedValueOnce(new Error('Note not found.'));

    render(<NoteDetailPanel importId="import-1" noteId="missing-note" />);

    expect(await screen.findByText('Error: Note not found.')).toBeInTheDocument();
  });

  it('renders empty states for tags/resources and fallback timestamps', async () => {
    mockedFetchNoteDetail.mockResolvedValueOnce({
      id: 'note-3',
      title: 'Empty Note',
      tags: [],
      contentHtml: '<p>No content</p>',
      createdAt: null,
      updatedAt: 'invalid-date',
      resources: []
    });

    render(<NoteDetailPanel importId="import-1" noteId="note-3" />);

    expect(await screen.findByRole('heading', { name: 'Empty Note' })).toBeInTheDocument();
    expect(screen.getByText('No tags')).toBeInTheDocument();
    expect(screen.getByText('No resources.')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('invalid-date')).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    mockedFetchNoteDetail.mockRejectedValueOnce(new Error('Network error'));

    render(<NoteDetailPanel importId="import-1" noteId="note-2" />);

    expect(await screen.findByText('Error: Network error')).toBeInTheDocument();
  });

  it('does not update state after unmount when the request fails', async () => {
    const deferred = createDeferred<NoteDetail>();
    mockedFetchNoteDetail.mockReturnValueOnce(deferred.promise);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { unmount } = render(<NoteDetailPanel importId="import-1" noteId="note-4" />);

    unmount();

    deferred.reject(new Error('Late failure'));

    await expect(deferred.promise).rejects.toThrow('Late failure');
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
