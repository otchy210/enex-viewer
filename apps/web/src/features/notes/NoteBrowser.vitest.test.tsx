import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NoteBrowser } from './NoteBrowser';

vi.mock('./NoteDetailPanel', () => ({
  NoteDetailPanel: ({ noteId }: { noteId: string | null }) => (
    <div data-testid="detail-panel">{noteId ?? 'none'}</div>
  )
}));

describe('NoteBrowser', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows loading/error/empty states', () => {
    const { rerender } = render(
      <NoteBrowser importId="import-1" loading error={null} data={null} />
    );
    expect(screen.getByText('Loading notes...')).toBeInTheDocument();

    rerender(<NoteBrowser importId="import-1" loading={false} error="Network error" data={null} />);
    expect(screen.getByText('Error: Network error')).toBeInTheDocument();

    rerender(<NoteBrowser importId="import-1" loading={false} error={null} data={{ total: 0, notes: [] }} />);
    expect(screen.getByText('No notes found for this import.')).toBeInTheDocument();
  });

  it('renders notes and updates the selection', () => {
    render(
      <NoteBrowser
        importId="import-4"
        loading={false}
        error={null}
        data={{
          total: 3,
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
            { id: 'note-3', title: 'Third note', tags: [], excerpt: 'Excerpt three' }
          ]
        }}
      />
    );

    expect(screen.getByText('First note')).toBeInTheDocument();
    expect(screen.getByText('Excerpt one')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('invalid-date')).toBeInTheDocument();
    expect(screen.getAllByText('—')[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /First note/ }));

    expect(screen.getByTestId('detail-panel')).toHaveTextContent('note-1');
    expect(screen.getByRole('button', { name: /First note/ })).toHaveClass('is-selected');
  });


  it('clears the selected note when list data changes and selected note is missing', () => {
    const { rerender } = render(
      <NoteBrowser
        importId="import-8"
        loading={false}
        error={null}
        data={{
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
              createdAt: '2024-01-02T00:00:00Z',
              tags: [],
              excerpt: 'Excerpt two'
            }
          ]
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /First note/ }));
    expect(screen.getByTestId('detail-panel')).toHaveTextContent('note-1');

    rerender(
      <NoteBrowser
        importId="import-8"
        loading={false}
        error={null}
        data={{
          total: 1,
          notes: [
            {
              id: 'note-2',
              title: 'Second note',
              createdAt: '2024-01-02T00:00:00Z',
              tags: [],
              excerpt: 'Excerpt two'
            }
          ]
        }}
      />
    );

    expect(screen.getByTestId('detail-panel')).toHaveTextContent('none');
  });
  it('clears the selected note when the import id changes', () => {
    const { rerender } = render(
      <NoteBrowser
        importId="import-6"
        loading={false}
        error={null}
        data={{
          total: 1,
          notes: [
            {
              id: 'note-1',
              title: 'First note',
              createdAt: '2024-01-01T00:00:00Z',
              tags: ['alpha'],
              excerpt: 'Excerpt one'
            }
          ]
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /First note/ }));
    expect(screen.getByTestId('detail-panel')).toHaveTextContent('note-1');

    rerender(
      <NoteBrowser
        importId="import-7"
        loading={false}
        error={null}
        data={{
          total: 1,
          notes: [
            {
              id: 'note-2',
              title: 'Second note',
              createdAt: '2024-02-01T00:00:00Z',
              tags: [],
              excerpt: 'Excerpt two'
            }
          ]
        }}
      />
    );

    expect(screen.getByTestId('detail-panel')).toHaveTextContent('none');
  });
});
