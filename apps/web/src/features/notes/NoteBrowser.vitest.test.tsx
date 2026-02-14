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
    const onSelectedNoteIdChange = vi.fn();
    const { rerender } = render(
      <NoteBrowser
        importId="import-1"
        loading
        error={null}
        data={null}
        selectedNoteId={null}
        onSelectedNoteIdChange={onSelectedNoteIdChange}
      />
    );
    expect(screen.getByText('Loading notes...')).toBeInTheDocument();

    rerender(
      <NoteBrowser
        importId="import-1"
        loading={false}
        error="Network error"
        data={null}
        selectedNoteId={null}
        onSelectedNoteIdChange={onSelectedNoteIdChange}
      />
    );
    expect(screen.getByText('Error: Network error')).toBeInTheDocument();

    rerender(
      <NoteBrowser
        importId="import-1"
        loading={false}
        error={null}
        data={{ total: 0, notes: [] }}
        selectedNoteId={null}
        onSelectedNoteIdChange={onSelectedNoteIdChange}
      />
    );
    expect(screen.getByText('No notes found for this import.')).toBeInTheDocument();
  });

  it('renders notes and delegates the selection change', () => {
    const onSelectedNoteIdChange = vi.fn();

    render(
      <NoteBrowser
        importId="import-4"
        loading={false}
        error={null}
        selectedNoteId="note-1"
        onSelectedNoteIdChange={onSelectedNoteIdChange}
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

    fireEvent.click(screen.getByRole('button', { name: /Second note/ }));

    expect(onSelectedNoteIdChange).toHaveBeenCalledWith('note-2');
    expect(screen.getByTestId('detail-panel')).toHaveTextContent('note-1');
    expect(screen.getByRole('button', { name: /First note/ })).toHaveClass('is-selected');
  });
});
