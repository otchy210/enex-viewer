import { useCallback, useState } from 'react';

import { parseEnexFile, type ParseEnexResponse } from '../api/enex';
import { getAsyncErrorMessage } from './asyncState';

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

export function useEnexUpload(): EnexUploadHook {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseEnexResponse | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setStatus('uploading');
    setError(null);

    try {
      const response = await parseEnexFile(file);
      setResult(response);
      setStatus('success');
    } catch (e) {
      setError(getAsyncErrorMessage(e));
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
  }, []);

  return { status, error, result, uploadFile, reset };
}
