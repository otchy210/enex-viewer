import { ensureOk } from './error';

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  await ensureOk(response);
  return (await response.json()) as T;
}
