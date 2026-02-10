import { ensureOk } from './error';

export type ApiResponse = {
  message: string;
  timestamp: string;
};

export async function fetchMessage(): Promise<ApiResponse> {
  const res = await fetch('/api/message');
  await ensureOk(res);

  return (await res.json()) as ApiResponse;
}
