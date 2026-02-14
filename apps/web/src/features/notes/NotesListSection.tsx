import { useMemo, type FormEvent, type ReactElement } from 'react';

import { formatSummaryTimestamp } from './formatters';

import type { NoteListResponse } from '../../api/notes';

interface NotesListSectionProps {
  importId: string | null;
  searchInput: string;
  query: string;
  limit: number;
  offset: number;
  loading: boolean;
  error: string | null;
  data: NoteListResponse | null;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClear: () => void;
  onLimitChange: (nextLimit: number) => void;
  onOffsetChange: (nextOffset: number) => void;
}

const LIMIT_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_LIMIT = LIMIT_OPTIONS[0];

export function NotesListSection({
  importId,
  searchInput,
  query,
  limit,
  offset,
  loading,
  error,
  data,
  onSearchInputChange,
  onSearchSubmit,
  onClear,
  onLimitChange,
  onOffsetChange
}: NotesListSectionProps): ReactElement {
  const total = data?.total ?? 0;
  const hasNotes = (data?.notes.length ?? 0) > 0;
  const startIndex = total === 0 ? 0 : offset + 1;
  const endIndex = Math.min(offset + limit, total);
  const canGoPrev = offset > 0;
  const canGoNext = offset + limit < total;

  const summaryText = useMemo(() => {
    if (importId == null) {
      return 'Upload an ENEX file to view notes.';
    }
    if (loading) {
      return 'Loading notes...';
    }
    if (error != null) {
      return 'Failed to load notes.';
    }
    if (!hasNotes) {
      return 'No notes found.';
    }

    return `Showing ${String(startIndex)}-${String(endIndex)} of ${String(total)} notes.`;
  }, [importId, loading, error, hasNotes, startIndex, endIndex, total]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit();
  };

  return (
    <section>
      <h2>Notes</h2>
      <p>{summaryText}</p>

      {importId == null ? null : (
        <>
          <form onSubmit={handleSubmit} className="notes-search">
            <label htmlFor="notes-search-input">Search notes</label>
            <div className="notes-search__controls">
              <input
                id="notes-search-input"
                type="search"
                placeholder="Search title or content"
                value={searchInput}
                onChange={(event) => {
                  onSearchInputChange(event.target.value);
                }}
              />
              <button type="submit" disabled={loading}>
                Search
              </button>
              <button type="button" onClick={onClear} disabled={loading && !query && !searchInput}>
                Clear
              </button>
              <label htmlFor="notes-limit-select">Per page</label>
              <select
                id="notes-limit-select"
                value={limit}
                onChange={(event) => {
                  onLimitChange(Number(event.target.value));
                }}
                disabled={loading}
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {error != null && <p className="error">Error: {error}</p>}

          {hasNotes && (
            <ul className="notes-list">
              {data?.notes.map((note) => (
                <li key={note.id} className="notes-list__item">
                  <article>
                    <header className="notes-list__header">
                      <h3>{note.title}</h3>
                      <small>
                        Updated: {formatSummaryTimestamp(note.updatedAt ?? note.createdAt)}
                      </small>
                    </header>
                    <p>{note.excerpt}</p>
                    <div className="notes-list__tags">
                      <strong>Tags:</strong> {note.tags.length > 0 ? note.tags.join(', ') : 'None'}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}

          {total > 0 && (
            <div className="notes-pagination">
              <button
                type="button"
                onClick={() => {
                  onOffsetChange(Math.max(offset - limit, 0));
                }}
                disabled={!canGoPrev || loading}
              >
                Previous
              </button>
              <span>
                {String(startIndex)}-{String(endIndex)} / {String(total)}
              </span>
              <button
                type="button"
                onClick={() => {
                  onOffsetChange(offset + limit);
                }}
                disabled={!canGoNext || loading}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export const NOTES_PAGE_LIMIT = DEFAULT_PAGE_LIMIT;
