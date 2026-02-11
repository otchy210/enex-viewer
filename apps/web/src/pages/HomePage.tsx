import { useEffect, useState } from 'react';

import { MessageSection } from '../components/MessageSection';
import { NoteBrowser } from '../features/notes/NoteBrowser';
import { NOTES_PAGE_LIMIT, NotesListSection } from '../features/notes/NotesListSection';
import { UploadSection } from '../features/upload/UploadSection';
import { useEnexUpload } from '../state/useEnexUpload';
import { useMessage } from '../state/useMessage';
import { useNotesList } from '../state/useNotesList';

export function HomePage() {
  const { data, error, loading } = useMessage();
  const upload = useEnexUpload();
  const importId = upload.result?.importId ?? null;

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);

  const notes = useNotesList(importId, {
    query,
    limit: NOTES_PAGE_LIMIT,
    offset
  });

  useEffect(() => {
    setSearchInput('');
    setQuery('');
    setOffset(0);
  }, [importId]);

  const handleSearchSubmit = () => {
    setOffset(0);
    setQuery(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput('');
    setQuery('');
    setOffset(0);
    notes.reload();
  };

  return (
    <main className="container">
      <h1>TypeScript REST API + Web UI</h1>

      <UploadSection {...upload} />
      <NotesListSection
        importId={importId}
        searchInput={searchInput}
        query={query}
        offset={offset}
        loading={notes.loading}
        error={notes.error}
        data={notes.data}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onClear={handleClear}
        onOffsetChange={setOffset}
      />
      {importId != null && (
        <NoteBrowser
          importId={importId}
          loading={notes.loading}
          error={notes.error}
          data={notes.data}
        />
      )}

      {loading && <p>Loading...</p>}
      {error != null && <p className="error">Error: {error}</p>}

      {data && <MessageSection data={data} />}
    </main>
  );
}
