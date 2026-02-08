import { useCallback, useEffect, useState } from 'react';

import { fetchNotesList, type NoteListResponse } from '../api/notes';

type NotesListState = {
  data: NoteListResponse | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

type NotesListOptions = {
  query: string;
  limit: number;
  offset: number;
};

export function useNotesList(
  importId: string | null,
  { query, limit, offset }: NotesListOptions
): NotesListState {
  const [data, setData] = useState<NoteListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!importId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchNotesList(importId, {
          q: query || undefined,
          limit,
          offset
        });
        if (!cancelled) {
          setData(response);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [importId, query, limit, offset, reloadKey]);

  return { data, error, loading, reload };
}
