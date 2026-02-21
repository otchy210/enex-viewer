import { sha256 } from '@noble/hashes/sha2';

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
  const hash = sha256.create();
  let loadedBytes = 0;

  throwIfAborted(signal);
  onProgress?.(0);

  try {
    for (;;) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      hash.update(value);
      loadedBytes += value.byteLength;

      if (file.size > 0) {
        onProgress?.(Math.min(loadedBytes / file.size, 1));
      }
    }
  } finally {
    reader.releaseLock();
  }

  onProgress?.(1);
  return toHex(hash.digest());
}
