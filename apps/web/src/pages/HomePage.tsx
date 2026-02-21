import { useEffect, useState, type ReactElement } from 'react';

import { NoteBrowser } from '../features/notes/NoteBrowser';
import { NOTES_PAGE_LIMIT, NotesListSection } from '../features/notes/NotesListSection';
import { UploadSection } from '../features/upload/UploadSection';
import { useEnexUpload } from '../state/useEnexUpload';
import { useNotesList } from '../state/useNotesList';

export function HomePage(): ReactElement {
  const upload = useEnexUpload();
  const importId = upload.importId;

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState<number>(NOTES_PAGE_LIMIT);
  const [offset, setOffset] = useState(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const notes = useNotesList(importId, {
    query,
    limit,
    offset
  });

  useEffect(() => {
    setSearchInput('');
    setQuery('');
    setOffset(0);
    setLimit(NOTES_PAGE_LIMIT);
    setSelectedNoteId(null);
  }, [importId]);

  useEffect(() => {
    if (selectedNoteId == null || notes.data == null) {
      return;
    }

    const existsInCurrentList = notes.data.notes.some((note) => note.id === selectedNoteId);
    if (!existsInCurrentList) {
      setSelectedNoteId(null);
    }
  }, [notes.data, selectedNoteId]);

  const handleSearchSubmit = () => {
    setOffset(0);
    setQuery(searchInput.trim());
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);

    if (value === '') {
      setQuery('');
      setOffset(0);
    }
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setOffset(0);
  };

  const handleClear = () => {
    setSearchInput('');
    setQuery('');
    setOffset(0);
  };

  return (
    <main className="container">
      <h1>ENEX Viewer</h1>

      <UploadSection {...upload} />
      <NotesListSection
        importId={importId}
        searchInput={searchInput}
        query={query}
        limit={limit}
        offset={offset}
        loading={notes.loading}
        error={notes.error}
        data={notes.data}
        onSearchInputChange={handleSearchInputChange}
        onSearchSubmit={handleSearchSubmit}
        onClear={handleClear}
        onLimitChange={handleLimitChange}
        onOffsetChange={setOffset}
      />
      {importId != null && (
        <NoteBrowser
          importId={importId}
          loading={notes.loading}
          error={notes.error}
          data={notes.data}
          selectedNoteId={selectedNoteId}
          onSelectedNoteIdChange={setSelectedNoteId}
        />
      )}
    </main>
  );
}
