import { useCallback, useRef, useState } from 'react';

import {
  lookupImportByHash,
  parseEnexFile,
  type HashLookupResponse,
  type ParseEnexResponse
} from '../api/enex';
import { ApiError } from '../api/error';
import { computeFileSha256 } from '../lib/hashFile';

export type UploadStatus =
  | 'idle'
  | 'hashing'
  | 'lookup'
  | 'ready'
  | 'uploading'
  | 'success'
  | 'skipped'
  | 'error';

interface EnexUploadState {
  status: UploadStatus;
  error: string | null;
  result: ParseEnexResponse | null;
  importId: string | null;
  hash: string | null;
  hashProgress: number;
  lookupMessage: string | null;
  selectedFileName: string | null;
}

interface EnexUploadActions {
  selectFile: (file: File | null) => Promise<void>;
  uploadSelectedFile: () => Promise<void>;
  retry: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

type EnexUploadHook = EnexUploadState & EnexUploadActions;

const createInitialState = (): EnexUploadState => ({
  status: 'idle',
  error: null,
  result: null,
  importId: null,
  hash: null,
  hashProgress: 0,
  lookupMessage: null,
  selectedFileName: null
});

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const toUserFriendlyError = (error: unknown): string => {
  if (error instanceof ApiError && error.code === 'INVALID_XML') {
    return 'The ENEX file appears to be corrupted. Please re-export it from Evernote and try again.';
  }

  if (isAbortError(error)) {
    return 'Hash calculation was canceled. Select the file again or retry.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

const applyLookupResult = (
  current: EnexUploadState,
  lookup: HashLookupResponse,
  keepResult: ParseEnexResponse | null
): EnexUploadState => {
  if (lookup.shouldUpload) {
    return {
      ...current,
      status: 'ready',
      importId: null,
      result: keepResult,
      lookupMessage: lookup.message
    };
  }

  return {
    ...current,
    status: 'skipped',
    importId: lookup.importId,
    result:
      lookup.importId != null
        ? {
            importId: lookup.importId,
            noteCount: keepResult?.noteCount ?? 0,
            warnings: keepResult?.warnings ?? []
          }
        : null,
    lookupMessage: lookup.message
  };
};

export function useEnexUpload(): EnexUploadHook {
  const [state, setState] = useState<EnexUploadState>(() => createInitialState());
  const selectedFileRef = useRef<File | null>(null);
  const preparationAbortRef = useRef<AbortController | null>(null);
  const activePreparationIdRef = useRef(0);

  const cancel = useCallback(() => {
    preparationAbortRef.current?.abort();
    preparationAbortRef.current = null;
  }, []);

  const prepareFile = useCallback(
    async (file: File) => {
      cancel();
      const abortController = new AbortController();
      const preparationId = activePreparationIdRef.current + 1;
      activePreparationIdRef.current = preparationId;
      preparationAbortRef.current = abortController;

      const isLatestPreparation = (): boolean =>
        activePreparationIdRef.current === preparationId && !abortController.signal.aborted;

      setState((current) => ({
        ...current,
        status: 'hashing',
        error: null,
        result: null,
        importId: null,
        hash: null,
        hashProgress: 0,
        lookupMessage: null,
        selectedFileName: file.name
      }));

      try {
        const hash = await computeFileSha256(file, {
          signal: abortController.signal,
          onProgress: (ratio) => {
            if (!isLatestPreparation()) {
              return;
            }

            setState((current) => ({
              ...current,
              hashProgress: ratio
            }));
          }
        });

        if (!isLatestPreparation()) {
          return;
        }

        setState((current) => ({
          ...current,
          status: 'lookup',
          hash,
          hashProgress: 1
        }));

        const lookup = await lookupImportByHash(hash, {
          signal: abortController.signal
        });

        if (!isLatestPreparation()) {
          return;
        }

        setState((current) => applyLookupResult(current, lookup, null));
      } catch (error) {
        if (!isLatestPreparation() || isAbortError(error)) {
          return;
        }

        setState((current) => ({
          ...current,
          status: 'error',
          error: toUserFriendlyError(error)
        }));
      } finally {
        if (preparationAbortRef.current === abortController) {
          preparationAbortRef.current = null;
        }
      }
    },
    [cancel]
  );

  const selectFile = useCallback(
    async (file: File | null) => {
      selectedFileRef.current = file;

      if (file == null) {
        cancel();
        setState(createInitialState());
        return;
      }

      await prepareFile(file);
    },
    [cancel, prepareFile]
  );

  const uploadSelectedFile = useCallback(async () => {
    const file = selectedFileRef.current;
    if (file == null || state.status !== 'ready') {
      return;
    }

    setState((current) => ({
      ...current,
      status: 'uploading',
      error: null
    }));

    try {
      const response = await parseEnexFile(file);
      setState((current) => ({
        ...current,
        status: 'success',
        result: response,
        importId: response.importId,
        lookupMessage: 'Upload complete.'
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: toUserFriendlyError(error)
      }));
    }
  }, [state.status]);

  const retry = useCallback(async () => {
    if (selectedFileRef.current == null) {
      return;
    }
    await prepareFile(selectedFileRef.current);
  }, [prepareFile]);

  const reset = useCallback(() => {
    cancel();
    selectedFileRef.current = null;
    setState(createInitialState());
  }, [cancel]);

  return {
    ...state,
    selectFile,
    uploadSelectedFile,
    retry,
    cancel,
    reset
  };
}
