import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import { bulkDownloadResources, fetchNoteDetail } from '../api/notes';
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
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(() => new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

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
    setSelectedNoteIds(new Set());
    setBulkError(null);
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

  const selectedInPageCount = useMemo(() => {
    if (notes.data == null) {
      return 0;
    }

    return notes.data.notes.filter((note) => selectedNoteIds.has(note.id)).length;
  }, [notes.data, selectedNoteIds]);

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

  const handleToggleSelectAllInPage = useCallback(() => {
    if (notes.data == null || notes.data.notes.length === 0) {
      return;
    }

    const pageIds = notes.data.notes.map((note) => note.id);
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      const allSelected = pageIds.every((noteId) => next.has(noteId));

      if (allSelected) {
        pageIds.forEach((noteId) => {
          next.delete(noteId);
        });
      } else {
        pageIds.forEach((noteId) => {
          next.add(noteId);
        });
      }

      return next;
    });
  }, [notes.data]);

  const handleToggleNoteSelection = useCallback((noteId: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }, []);

  const handleDownloadSelected = useCallback(async () => {
    if (importId == null || selectedNoteIds.size === 0) {
      return;
    }

    setBulkError(null);
    setBulkDownloading(true);

    try {
      const selectedIds = [...selectedNoteIds];
      const details = await Promise.all(
        selectedIds.map(async (noteId) => fetchNoteDetail(importId, noteId))
      );
      const resources = details.flatMap((note) =>
        note.resources.map((resource) => ({ noteId: note.id, resourceId: resource.id }))
      );

      if (resources.length === 0) {
        throw new Error('Selected notes do not contain downloadable attachments.');
      }

      const { blob, fileName } = await bulkDownloadResources(importId, resources);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setBulkError(`Failed to download selected attachments. ${message}`);
    } finally {
      setBulkDownloading(false);
    }
  }, [importId, selectedNoteIds]);

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
        selectedCount={selectedNoteIds.size}
        selectedInPageCount={selectedInPageCount}
        bulkDownloading={bulkDownloading}
        bulkError={bulkError}
        onSearchInputChange={handleSearchInputChange}
        onSearchSubmit={handleSearchSubmit}
        onClear={handleClear}
        onLimitChange={handleLimitChange}
        onOffsetChange={setOffset}
        onToggleSelectAllInPage={handleToggleSelectAllInPage}
        onDownloadSelected={() => {
          void handleDownloadSelected();
        }}
      />
      {importId != null && (
        <NoteBrowser
          importId={importId}
          loading={notes.loading}
          error={notes.error}
          data={notes.data}
          selectedNoteId={selectedNoteId}
          selectedNoteIds={selectedNoteIds}
          onSelectedNoteIdChange={setSelectedNoteId}
          onToggleNoteSelection={handleToggleNoteSelection}
        />
      )}
    </main>
  );
}
