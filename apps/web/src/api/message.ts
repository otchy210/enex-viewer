export type ApiResponse = {
  message: string;
  timestamp: string;
};

export async function fetchMessage(): Promise<ApiResponse> {
  const res = await fetch('/api/message');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return (await res.json()) as ApiResponse;
}
