import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoteDetailPanel } from './NoteDetailPanel';
import { fetchNoteDetail, type NoteDetail } from '../../api/notes';

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
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
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
    expect(screen.getByRole('heading', { name: 'Resources', level: 4 })).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Content', level: 4 })).toBeInTheDocument();
  });

  it('shows an error when the note is missing', async () => {
    mockedFetchNoteDetail.mockRejectedValueOnce(new Error('Note not found.'));

    render(<NoteDetailPanel importId="import-1" noteId="missing-note" />);

    expect(await screen.findByText('Error: Note not found.')).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    mockedFetchNoteDetail.mockRejectedValueOnce(new Error('Network error'));

    render(<NoteDetailPanel importId="import-1" noteId="note-2" />);

    expect(await screen.findByText('Error: Network error')).toBeInTheDocument();
  });
});
