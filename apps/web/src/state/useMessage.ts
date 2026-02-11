import { useEffect, useState } from 'react';

import {
  createAsyncErrorState,
  createAsyncIdleState,
  createAsyncSuccessState,
  type AsyncDataState
} from './asyncState';
import { fetchMessage, type ApiResponse } from '../api/message';

type MessageState = AsyncDataState<ApiResponse>;

export function useMessage(): MessageState {
  const [state, setState] = useState<MessageState>(() => createAsyncIdleState(true));

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetchMessage();
        setState(createAsyncSuccessState(response));
      } catch (e) {
        setState(createAsyncErrorState(e));
      }
    };

    void run();
  }, []);

  return state;
}
