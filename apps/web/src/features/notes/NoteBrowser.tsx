import { useEffect, useState } from 'react';

import type { NoteListResponse } from '../../api/notes';
import { NoteDetailPanel } from './NoteDetailPanel';
import { formatSummaryTimestamp } from './formatters';

type NoteBrowserProps = {
  importId: string;
  loading: boolean;
  error: string | null;
  data: NoteListResponse | null;
};

export function NoteBrowser({ importId, loading, error, data }: NoteBrowserProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedNoteId(null);
  }, [importId]);

  return (
    <section>
      <h2>Notes</h2>

      {loading && <p>Loading notes...</p>}
      {!loading && error && <p className="error">Error: {error}</p>}

      {!loading && !error && data && data.notes.length === 0 && (
        <p>No notes found for this import.</p>
      )}

      {!loading && !error && data && data.notes.length > 0 && (
        <div className="note-browser">
          <div className="note-list" role="list">
            {data.notes.map((note) => (
              <button
                key={note.id}
                type="button"
                className={`note-list-item${selectedNoteId === note.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedNoteId(note.id)}
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
