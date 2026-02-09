import { useEffect, useMemo, useState } from 'react';

import { fetchNoteDetail, type NoteDetail } from '../../api/notes';
import { formatResourceLabel, formatTimestamp } from './formatters';

type NoteDetailPanelProps = {
  importId: string;
  noteId: string | null;
};

type DetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; note: NoteDetail };

const NoteContent = ({ html }: { html: string }) => {
  const safeMarkup = useMemo(() => ({ __html: html }), [html]);
  return <div className="note-content" dangerouslySetInnerHTML={safeMarkup} />;
};

export function NoteDetailPanel({ importId, noteId }: NoteDetailPanelProps) {
  const [state, setState] = useState<DetailState>({ status: 'idle' });

  useEffect(() => {
    if (!noteId) {
      setState({ status: 'idle' });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    fetchNoteDetail(importId, noteId)
      .then((note) => {
        if (active) {
          setState({ status: 'success', note });
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
  }, [importId, noteId]);

  if (!noteId) {
    return (
      <div className="note-detail">
        <p>Select a note to view details.</p>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="note-detail">
        <p>Loading note details...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="note-detail">
        <p className="error">Error: {state.error}</p>
      </div>
    );
  }

  if (state.status !== 'success') {
    return (
      <div className="note-detail">
        <p>Note details are not available yet.</p>
      </div>
    );
  }

  const { note } = state;

  return (
    <div className="note-detail">
      <header className="note-detail-header">
        <h3>{note.title}</h3>
        {note.tags.length > 0 ? (
          <ul className="note-tags">
            {note.tags.map((tag) => (
              <li key={tag} className="note-tag">
                {tag}
              </li>
            ))}
          </ul>
        ) : (
          <p className="note-empty">No tags</p>
        )}
      </header>

      <dl className="note-meta">
        <div>
          <dt>Created</dt>
          <dd>{formatTimestamp(note.createdAt)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatTimestamp(note.updatedAt)}</dd>
        </div>
        <div>
          <dt>Resources</dt>
          <dd>{note.resources.length}</dd>
        </div>
      </dl>

      <section>
        <h4>Resources</h4>
        {note.resources.length > 0 ? (
          <ul className="note-resources">
            {note.resources.map((resource) => (
              <li key={resource.id}>
                <span>{formatResourceLabel(resource)}</span>
                {resource.size !== undefined && (
                  <span className="note-resource-meta">{resource.size} bytes</span>
                )}
                {resource.mime && (
                  <span className="note-resource-meta">{resource.mime}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="note-empty">No resources.</p>
        )}
      </section>

      <section>
        <h4>Content</h4>
        <NoteContent html={note.contentHtml} />
      </section>
    </div>
  );
}
