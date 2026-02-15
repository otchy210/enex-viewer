import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';

import type { ParseEnexResponse } from '../../api/enex';
import type { UploadStatus } from '../../state/useEnexUpload';

interface UploadSectionProps {
  status: UploadStatus;
  error: string | null;
  result: ParseEnexResponse | null;
  importId: string | null;
  hash: string | null;
  hashProgress: number;
  lookupMessage: string | null;
  selectedFileName: string | null;
  selectFile: (file: File | null) => Promise<void>;
  uploadSelectedFile: () => Promise<void>;
  retry: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function UploadSection({
  status,
  error,
  result,
  importId,
  hash,
  hashProgress,
  lookupMessage,
  selectedFileName,
  selectFile,
  uploadSelectedFile,
  retry,
  cancel,
  reset
}: UploadSectionProps): ReactElement {
  const [hasFile, setHasFile] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setHasFile(file != null);
    void selectFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await uploadSelectedFile();
  };

  const showUploadButton = status !== 'idle';
  const uploadDisabled = status !== 'ready';

  return (
    <section>
      <h2>Upload ENEX</h2>
      <p>Select an ENEX file to start parsing.</p>

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <input
          aria-label="ENEX file"
          type="file"
          accept=".enex,application/xml,text/xml"
          onChange={handleFileChange}
        />
        {showUploadButton && (
          <button type="submit" disabled={uploadDisabled}>
            {status === 'uploading' ? 'Uploading...' : 'Upload'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setHasFile(false);
            reset();
          }}
          disabled={!hasFile && status === 'idle'}
        >
          Clear
        </button>
      </form>

      {selectedFileName != null && (
        <p>
          Selected file: <strong>{selectedFileName}</strong>
        </p>
      )}

      {status === 'idle' && <p>Ready to upload.</p>}

      {status === 'hashing' && (
        <div>
          <p>Calculating SHA-256 hash...</p>
          <progress value={hashProgress} max={1} aria-label="Hash progress" />
          <p>{Math.round(hashProgress * 100)}%</p>
          <button type="button" onClick={cancel}>
            Cancel hash
          </button>
        </div>
      )}

      {status === 'lookup' && <p>Checking for existing import by hash...</p>}

      {hash != null && (
        <p>
          SHA-256: <code>{hash}</code>
        </p>
      )}

      {(status === 'ready' || status === 'skipped') && lookupMessage != null && (
        <p>{lookupMessage}</p>
      )}

      {status === 'ready' && <p>No existing import was found. You can upload this file.</p>}

      {status === 'uploading' && <p>Uploading ENEX file...</p>}

      {status === 'skipped' && importId != null && (
        <div>
          <p>
            Existing import can be reused: <strong>{importId}</strong>
          </p>
          <a href="#notes-list">Go to notes list</a>
        </div>
      )}

      {status === 'success' && result && (
        <div>
          <p>Upload complete.</p>
          <p>
            Import ID: <strong>{result.importId}</strong>
          </p>
          <p>Notes detected: {result.noteCount}</p>
          {result.warnings.length > 0 && <p>Warnings: {result.warnings.length}</p>}
        </div>
      )}

      {status === 'error' && error != null && (
        <div className="error" role="alert">
          <p>Error: {error}</p>
          <button
            type="button"
            onClick={() => {
              void retry();
            }}
          >
            Retry hash lookup
          </button>
        </div>
      )}
    </section>
  );
}
