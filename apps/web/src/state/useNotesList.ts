import { useCallback, useEffect, useState } from 'react';

import { fetchNotesList, type NoteListResponse } from '../api/notes';
import {
  createAsyncErrorState,
  createAsyncIdleState,
  createAsyncLoadingState,
  createAsyncSuccessState,
  type AsyncDataState
} from './asyncState';

type NotesListState = AsyncDataState<NoteListResponse> & {
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
  const [state, setState] = useState<AsyncDataState<NoteListResponse>>(() =>
    createAsyncIdleState()
  );
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!importId) {
      setState(createAsyncIdleState());
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState(createAsyncLoadingState());

      try {
        const response = await fetchNotesList(importId, {
          q: query || undefined,
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

    run();

    return () => {
      cancelled = true;
    };
  }, [importId, query, limit, offset, reloadKey]);

  return { ...state, reload };
}
