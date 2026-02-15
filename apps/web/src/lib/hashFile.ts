interface ComputeHashOptions {
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted === true) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
};

export async function computeFileSha256(file: File, options: ComputeHashOptions = {}): Promise<string> {
  const { onProgress, signal } = options;
  const reader = file.stream().getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  throwIfAborted(signal);
  onProgress?.(0);

  for (;;) {
    throwIfAborted(signal);
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    loadedBytes += value.byteLength;

    if (file.size > 0) {
      onProgress?.(Math.min(loadedBytes / file.size, 1));
    }
  }

  const allBytes = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    allBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const digest = await crypto.subtle.digest('SHA-256', allBytes);
  onProgress?.(1);

  return toHex(new Uint8Array(digest));
}
