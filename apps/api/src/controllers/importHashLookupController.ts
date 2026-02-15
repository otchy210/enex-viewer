import { findImportIdByHash } from '../repositories/importSessionRepository.js';

import type { Request, Response } from 'express';

interface HashLookupRequestBody {
  hash?: unknown;
}

interface HashLookupResponse {
  hash: string;
  importId: string | null;
  shouldUpload: boolean;
  message: string;
}

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

export const importHashLookupController = (
  req: Request<unknown, unknown, HashLookupRequestBody>,
  res: Response<HashLookupResponse | { code: string; message: string }>
): void => {
  const hash = req.body.hash;

  if (typeof hash !== 'string' || !HASH_PATTERN.test(hash)) {
    res.status(400).json({
      code: 'INVALID_HASH',
      message: 'hash must be a SHA-256 hex string.'
    });
    return;
  }

  const importId = findImportIdByHash(hash) ?? null;

  if (importId === null) {
    res.json({
      hash,
      importId,
      shouldUpload: true,
      message: 'No import found for the hash. Continue with POST /api/enex/parse.'
    });
    return;
  }

  res.json({
    hash,
    importId,
    shouldUpload: false,
    message: 'Existing import found. You can skip upload and reuse the importId.'
  });
};
