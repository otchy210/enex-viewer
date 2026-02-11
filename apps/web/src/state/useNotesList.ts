import { useCallback, useEffect, useState } from 'react';

import {
  createAsyncErrorState,
  createAsyncIdleState,
  createAsyncLoadingState,
  createAsyncSuccessState,
  type AsyncDataState
} from './asyncState';
import { fetchNotesList, type NoteListResponse } from '../api/notes';

type NotesListState = AsyncDataState<NoteListResponse> & {
  reload: () => void;
};

interface NotesListOptions {
  query: string;
  limit: number;
  offset: number;
}

export function useNotesList(
  importId: string | null,
  { query, limit, offset }: NotesListOptions
): NotesListState {
  const [state, setState] = useState<AsyncDataState<NoteListResponse>>(() =>
    createAsyncIdleState()
  );
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (importId == null) {
      setState(createAsyncIdleState());
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState(createAsyncLoadingState());

      try {
        const response = await fetchNotesList(importId, {
          q: query.length > 0 ? query : undefined,
          limit,
          offset
        });
        if (!cancelled) {
          setState(createAsyncSuccessState(response));
        }
      } catch (e) {
        if (!cancelled) {
          setState(createAsyncErrorState(e));
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [importId, query, limit, offset, reloadKey]);

  return { ...state, reload };
}
