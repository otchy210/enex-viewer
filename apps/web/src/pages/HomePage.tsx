import { MessageSection } from '../components/MessageSection';
import { NoteBrowser } from '../features/notes/NoteBrowser';
import { NotesListSection } from '../features/notes/NotesListSection';
import { UploadSection } from '../features/upload/UploadSection';
import { useEnexUpload } from '../state/useEnexUpload';
import { useMessage } from '../state/useMessage';

export function HomePage() {
  const { data, error, loading } = useMessage();
  const upload = useEnexUpload();
  const importId = upload.result?.importId ?? null;

  return (
    <main className="container">
      <h1>TypeScript REST API + Web UI</h1>

      <UploadSection {...upload} />
      <NotesListSection importId={importId} />
      {importId && <NoteBrowser importId={importId} />}

      {loading && <p>Loading...</p>}
      {error && <p className="error">Error: {error}</p>}

      {data && <MessageSection data={data} />}
    </main>
  );
}
