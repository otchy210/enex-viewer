import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useNotesList } from '../../state/useNotesList';
import { formatSummaryTimestamp } from './formatters';

type NotesListSectionProps = {
  importId: string | null;
};

const PAGE_LIMIT = 20;

export function NotesListSection({ importId }: NotesListSectionProps) {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);

  const { data, error, loading, reload } = useNotesList(importId, {
    query,
    limit: PAGE_LIMIT,
    offset
  });

  useEffect(() => {
    setSearchInput('');
    setQuery('');
    setOffset(0);
  }, [importId]);

  const total = data?.total ?? 0;
  const hasNotes = (data?.notes.length ?? 0) > 0;
  const startIndex = total === 0 ? 0 : offset + 1;
  const endIndex = Math.min(offset + PAGE_LIMIT, total);
  const canGoPrev = offset > 0;
  const canGoNext = offset + PAGE_LIMIT < total;

  const summaryText = useMemo(() => {
    if (!importId) {
      return 'Upload an ENEX file to view notes.';
    }
    if (loading) {
      return 'Loading notes...';
    }
    if (error) {
      return 'Failed to load notes.';
    }
    if (!hasNotes) {
      return 'No notes found.';
    }

    return `Showing ${startIndex}-${endIndex} of ${total} notes.`;
  }, [importId, loading, error, hasNotes, startIndex, endIndex, total]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOffset(0);
    setQuery(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput('');
    setQuery('');
    setOffset(0);
    reload();
  };

  return (
    <section>
      <h2>Notes</h2>
      <p>{summaryText}</p>

      {!importId ? null : (
        <>
          <form onSubmit={handleSubmit} className="notes-search">
            <label htmlFor="notes-search-input">Search notes</label>
            <div className="notes-search__controls">
              <input
                id="notes-search-input"
                type="search"
                placeholder="Search title or content"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button type="submit" disabled={loading}>
                Search
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={loading && !query && !searchInput}
              >
                Clear
              </button>
            </div>
          </form>

          {error && <p className="error">Error: {error}</p>}

          {hasNotes && (
            <ul className="notes-list">
              {data?.notes.map((note) => (
                <li key={note.id} className="notes-list__item">
                  <article>
                    <header className="notes-list__header">
                      <h3>{note.title}</h3>
                      <small>
                        Updated:{' '}
                        {formatSummaryTimestamp(note.updatedAt ?? note.createdAt)}
                      </small>
                    </header>
                    <p>{note.excerpt}</p>
                    <div className="notes-list__tags">
                      <strong>Tags:</strong>{' '}
                      {note.tags.length > 0 ? note.tags.join(', ') : 'None'}
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
                onClick={() => setOffset((prev) => Math.max(prev - PAGE_LIMIT, 0))}
                disabled={!canGoPrev || loading}
              >
                Previous
              </button>
              <span>
                {startIndex}-{endIndex} / {total}
              </span>
              <button
                type="button"
                onClick={() => setOffset((prev) => prev + PAGE_LIMIT)}
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
