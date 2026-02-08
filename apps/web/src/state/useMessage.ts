import { useEffect, useState } from 'react';

import { fetchMessage, type ApiResponse } from '../api/message';

type MessageState = {
  data: ApiResponse | null;
  error: string | null;
  loading: boolean;
};

export function useMessage(): MessageState {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetchMessage();
        setData(response);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return { data, error, loading };
}
