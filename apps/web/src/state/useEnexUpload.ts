import { useCallback, useState } from 'react';

import { parseEnexFile, type ParseEnexResponse } from '../api/enex';
import {
  createAsyncErrorState,
  createAsyncIdleState,
  createAsyncLoadingState,
  createAsyncSuccessState,
  type AsyncDataState
} from './asyncState';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type EnexUploadState = {
  status: UploadStatus;
  error: string | null;
  result: ParseEnexResponse | null;
};

type EnexUploadActions = {
  uploadFile: (file: File) => Promise<void>;
  reset: () => void;
};

type EnexUploadHook = EnexUploadState & EnexUploadActions;

const toUploadStatus = (state: AsyncDataState<ParseEnexResponse>): UploadStatus => {
  if (state.loading) {
    return 'uploading';
  }

  if (state.error) {
    return 'error';
  }

  if (state.data) {
    return 'success';
  }

  return 'idle';
};

export function useEnexUpload(): EnexUploadHook {
  const [state, setState] = useState<AsyncDataState<ParseEnexResponse>>(() =>
    createAsyncIdleState()
  );

  const uploadFile = useCallback(async (file: File) => {
    setState(createAsyncLoadingState());

    try {
      const response = await parseEnexFile(file);
      setState(createAsyncSuccessState(response));
    } catch (error) {
      setState(createAsyncErrorState(error));
    }
  }, []);

  const reset = useCallback(() => {
    setState(createAsyncIdleState());
  }, []);

  return {
    status: toUploadStatus(state),
    error: state.error,
    result: state.data,
    uploadFile,
    reset
  };
}
