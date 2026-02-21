import { type ReactElement } from 'react';

import { formatSummaryTimestamp } from './formatters';
import { NoteDetailPanel } from './NoteDetailPanel';

import type { NoteListResponse } from '../../api/notes';

interface NoteBrowserProps {
  importId: string;
  loading: boolean;
  error: string | null;
  data: NoteListResponse | null;
  selectedNoteId: string | null;
  selectedNoteIds: ReadonlySet<string>;
  onSelectedNoteIdChange: (noteId: string) => void;
  onToggleNoteSelection: (noteId: string) => void;
}

export function NoteBrowser({
  importId,
  loading,
  error,
  data,
  selectedNoteId,
  selectedNoteIds,
  onSelectedNoteIdChange,
  onToggleNoteSelection
}: NoteBrowserProps): ReactElement {
  return (
    <section>
      {loading && <p>Loading notes...</p>}
      {!loading && error != null && <p className="error">Error: {error}</p>}

      {!loading && error == null && data?.notes.length === 0 && (
        <p>No notes found for this import.</p>
      )}

      {!loading && error == null && data != null && data.notes.length > 0 && (
        <div className="note-browser">
          <div className="note-list" role="list">
            {data.notes.map((note) => (
              <div
                key={note.id}
                className={`note-list-item${selectedNoteId === note.id ? ' is-selected' : ''}`}
                role="listitem"
              >
                <label className="note-list-select">
                  <input
                    type="checkbox"
                    checked={selectedNoteIds.has(note.id)}
                    aria-label={`Select note ${note.title}`}
                    onChange={() => {
                      onToggleNoteSelection(note.id);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="note-list-item__button"
                  onClick={() => {
                    onSelectedNoteIdChange(note.id);
                  }}
                >
                  <div className="note-list-header">
                    <span className="note-list-title">{note.title}</span>
                    <span className="note-list-date">
                      {formatSummaryTimestamp(note.updatedAt ?? note.createdAt)}
                    </span>
                  </div>
                  {note.tags.length > 0 && (
                    <div className="note-list-tags">
                      {note.tags.map((tag) => (
                        <span key={tag} className="note-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="note-list-excerpt">{note.excerpt}</p>
                </button>
              </div>
            ))}
          </div>

          <NoteDetailPanel importId={importId} noteId={selectedNoteId} />
        </div>
      )}
    </section>
  );
}
