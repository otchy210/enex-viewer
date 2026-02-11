import { useEffect, useState } from 'react';

import { formatResourceLabel, formatTimestamp } from './formatters';
import { NoteContent } from './NoteContent';
import { fetchNoteDetail, type NoteDetail } from '../../api/notes';
import {
  createAsyncErrorState,
  createAsyncIdleState,
  createAsyncLoadingState,
  createAsyncSuccessState,
  type AsyncDataState
} from '../../state/asyncState';

interface NoteDetailPanelProps {
  importId: string;
  noteId: string | null;
}

export function NoteDetailPanel({ importId, noteId }: NoteDetailPanelProps) {
  const [state, setState] = useState<AsyncDataState<NoteDetail>>(() => createAsyncIdleState());

  useEffect(() => {
    if (noteId == null) {
      setState(createAsyncIdleState());
      return;
    }

    let active = true;

    const run = async () => {
      setState(createAsyncLoadingState());
      try {
        const note = await fetchNoteDetail(importId, noteId);
        if (active) {
          setState(createAsyncSuccessState(note));
        }
      } catch (error) {
        if (active) {
          setState(createAsyncErrorState(error));
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [importId, noteId]);

  if (noteId == null) {
    return (
      <div className="note-detail">
        <p>Select a note to view details.</p>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="note-detail">
        <p>Loading note details...</p>
      </div>
    );
  }

  if (state.error != null) {
    return (
      <div className="note-detail">
        <p className="error">Error: {state.error}</p>
      </div>
    );
  }

  if (state.data == null) {
    return (
      <div className="note-detail">
        <p>Note details are not available yet.</p>
      </div>
    );
  }

  const note = state.data;

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
                {resource.mime != null && resource.mime.length > 0 && (
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
