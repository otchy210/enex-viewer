import { useState, type ChangeEvent, type FormEvent } from 'react';

import { useEnexUpload } from '../../state/useEnexUpload';

export function UploadSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { status, error, result, uploadFile, reset } = useEnexUpload();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (status === 'success' || status === 'error') {
      reset();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }
    await uploadFile(selectedFile);
  };

  return (
    <section>
      <h2>Upload ENEX</h2>
      <p>Select an ENEX file to start parsing.</p>

      <form onSubmit={handleSubmit}>
        <input
          aria-label="ENEX file"
          type="file"
          accept=".enex,application/xml,text/xml"
          onChange={handleFileChange}
        />
        <button type="submit" disabled={!selectedFile || status === 'uploading'}>
          {status === 'uploading' ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {status === 'idle' && <p>Ready to upload.</p>}
      {status === 'uploading' && <p>Uploading ENEX file...</p>}
      {status === 'success' && result && (
        <div>
          <p>Upload complete.</p>
          <p>
            Import ID: <strong>{result.importId}</strong>
          </p>
          <p>Notes detected: {result.noteCount}</p>
          {result.warnings.length > 0 && (
            <p>Warnings: {result.warnings.length}</p>
          )}
        </div>
      )}
      {status === 'error' && error && <p className="error">Error: {error}</p>}
    </section>
  );
}
