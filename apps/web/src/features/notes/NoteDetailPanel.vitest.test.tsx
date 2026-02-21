import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
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
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/api/imports/import-1/notes/note-1/resources/resource-1'
    );
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

  it('shows an alert when resource download fails', async () => {
    mockedFetchNoteDetail.mockResolvedValueOnce({
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

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    render(<NoteDetailPanel importId="import-1" noteId="note-1" />);

    fireEvent.click(await screen.findByRole('link', { name: 'Download' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to download attachment. Not found'
    );
  });

  it('clears previous download error when switching to another note', async () => {
    mockedFetchNoteDetail
      .mockResolvedValueOnce({
        id: 'note-1',
        title: 'First note',
        tags: ['demo'],
        contentHtml: '<p>First</p>',
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
      })
      .mockResolvedValueOnce({
        id: 'note-2',
        title: 'Second note',
        tags: ['demo'],
        contentHtml: '<p>Second</p>',
        createdAt: '20240103T010203Z',
        updatedAt: '20240104T030405Z',
        resources: [
          {
            id: 'resource-2',
            fileName: 'document.pdf',
            mime: 'application/pdf',
            size: 1024
          }
        ]
      });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const { rerender } = render(<NoteDetailPanel importId="import-1" noteId="note-1" />);

    fireEvent.click(await screen.findByRole('link', { name: 'Download' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to download attachment. Not found'
    );

    rerender(<NoteDetailPanel importId="import-1" noteId="note-2" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Second note' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/api/imports/import-1/notes/note-2/resources/resource-2'
    );
  });

  it('fetches resource endpoint when download link is clicked', async () => {
    mockedFetchNoteDetail.mockResolvedValueOnce({
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

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:https://example.test/resource-1')
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn()
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('binary', {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' }
      })
    );
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    render(<NoteDetailPanel importId="import-1" noteId="note-1" />);

    fireEvent.click(await screen.findByRole('link', { name: 'Download' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/imports/import-1/notes/note-1/resources/resource-1');
    });
    expect(anchorClickSpy).toHaveBeenCalled();
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
