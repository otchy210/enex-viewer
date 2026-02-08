import { MessageSection } from '../components/MessageSection';
import { useMessage } from '../state/useMessage';

export function HomePage() {
  const { data, error, loading } = useMessage();

  return (
    <main className="container">
      <h1>TypeScript REST API + Web UI</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="error">Error: {error}</p>}

      {data && <MessageSection data={data} />}
    </main>
  );
}
