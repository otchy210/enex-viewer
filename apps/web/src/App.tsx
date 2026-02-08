import { useEffect, useState } from 'react';

type ApiResponse = {
  message: string;
  timestamp: string;
};

export function App() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/message');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as ApiResponse;
        setData(json);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <main className="container">
      <h1>TypeScript REST API + Web UI</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="error">Error: {error}</p>}

      {data && (
        <section>
          <p>{data.message}</p>
          <small>{data.timestamp}</small>
        </section>
      )}
    </main>
  );
}
