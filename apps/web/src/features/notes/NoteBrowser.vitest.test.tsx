import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const onToggleNoteSelection = vi.fn();
    const { rerender } = render(
      <NoteBrowser
        importId="import-1"
        loading
        error={null}
        data={null}
        selectedNoteId={null}
        selectedNoteIds={new Set()}
        onSelectedNoteIdChange={onSelectedNoteIdChange}
        onToggleNoteSelection={onToggleNoteSelection}
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
        selectedNoteIds={new Set()}
        onSelectedNoteIdChange={onSelectedNoteIdChange}
        onToggleNoteSelection={onToggleNoteSelection}
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
        selectedNoteIds={new Set()}
        onSelectedNoteIdChange={onSelectedNoteIdChange}
        onToggleNoteSelection={onToggleNoteSelection}
      />
    );
    expect(screen.getByText('No notes found for this import.')).toBeInTheDocument();
  });

  it('delegates selection updates and reflects controlled selectedNoteId', async () => {
    const onSelectedNoteIdChange = vi.fn();
    const onToggleNoteSelection = vi.fn();
    const data = {
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
    };

    const { rerender } = render(
      <NoteBrowser
        importId="import-4"
        loading={false}
        error={null}
        selectedNoteId="note-1"
        selectedNoteIds={new Set(['note-1'])}
        onSelectedNoteIdChange={onSelectedNoteIdChange}
        onToggleNoteSelection={onToggleNoteSelection}
        data={data}
      />
    );

    expect(screen.getByText('First note')).toBeInTheDocument();
    expect(screen.getByText('Excerpt one')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('invalid-date')).toBeInTheDocument();
    expect(screen.getAllByText('—')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /First note/ })).toHaveClass('is-selected');
    expect(screen.getByRole('checkbox', { name: 'Select note First note' })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Second note/ }));
    expect(onSelectedNoteIdChange).toHaveBeenCalledWith('note-2');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select note Second note' }));
    expect(onToggleNoteSelection).toHaveBeenCalledWith('note-2');

    rerender(
      <NoteBrowser
        importId="import-4"
        loading={false}
        error={null}
        selectedNoteId="note-2"
        selectedNoteIds={new Set(['note-1', 'note-2'])}
        onSelectedNoteIdChange={onSelectedNoteIdChange}
        onToggleNoteSelection={onToggleNoteSelection}
        data={data}
      />
    );

    expect(screen.getByRole('button', { name: /Second note/ })).toHaveClass('is-selected');
    expect(screen.getByRole('checkbox', { name: 'Select note Second note' })).toBeChecked();
    expect(screen.getByTestId('detail-panel')).toHaveTextContent('note-2');
  });
});
