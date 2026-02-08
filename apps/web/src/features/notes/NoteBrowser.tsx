import { useEffect, useState } from 'react';

import { fetchNotesList, type NoteListResponse, type NoteSummary } from '../../api/notes';
import { NoteDetailPanel } from './NoteDetailPanel';

type NoteBrowserProps = {
  importId: string;
};

type ListState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: NoteListResponse };

const formatSummaryTimestamp = (note: NoteSummary): string => {
  const value = note.updatedAt ?? note.createdAt;
  if (!value) {
    return '—';
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleDateString();
};

export function NoteBrowser({ importId }: NoteBrowserProps) {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    setSelectedNoteId(null);

    fetchNotesList(importId, { limit: 50, offset: 0 })
      .then((data) => {
        if (active) {
          setState({ status: 'success', data });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        setState({ status: 'error', error: message });
      });

    return () => {
      active = false;
    };
  }, [importId]);

  return (
    <section>
      <h2>Notes</h2>

      {state.status === 'loading' && <p>Loading notes...</p>}
      {state.status === 'error' && <p className="error">Error: {state.error}</p>}

      {state.status === 'success' && state.data.notes.length === 0 && (
        <p>No notes found for this import.</p>
      )}

      {state.status === 'success' && state.data.notes.length > 0 && (
        <div className="note-browser">
          <div className="note-list" role="list">
            {state.data.notes.map((note) => (
              <button
                key={note.id}
                type="button"
                className={`note-list-item${
                  selectedNoteId === note.id ? ' is-selected' : ''
                }`}
                onClick={() => setSelectedNoteId(note.id)}
              >
                <div className="note-list-header">
                  <span className="note-list-title">{note.title}</span>
                  <span className="note-list-date">{formatSummaryTimestamp(note)}</span>
                </div>
                {note.tags.length > 0 && (
                  <div className="note-list-tags">
                    {note.tags.map((tag) => (
                      <span key={`${note.id}-${tag}`} className="note-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="note-list-excerpt">{note.excerpt}</p>
              </button>
            ))}
          </div>

          <NoteDetailPanel importId={importId} noteId={selectedNoteId} />
        </div>
      )}
    </section>
  );
}
