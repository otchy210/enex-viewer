import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseEnexFile, EnexParseError } from './enexParseService.js';
import * as enexParserService from './enexParserService.js';
import * as importSessionRepository from '../repositories/importSessionRepository.js';

describe('parseEnexFile WAL checkpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('flushes WAL checkpoint after successful parse completion', () => {
    const checkpointSpy = vi
      .spyOn(importSessionRepository, 'checkpointImportDatabaseWal')
      .mockImplementation(() => {});

    vi.spyOn(importSessionRepository, 'findImportIdByHash').mockReturnValue('import-1');
    vi.spyOn(importSessionRepository, 'getImportSession').mockReturnValue({
      id: 'import-1',
      hash: 'a'.repeat(64),
      createdAt: '2026-01-01T00:00:00.000Z',
      noteCount: 1,
      warnings: [],
      notes: [],
      noteListIndex: []
    });

    const result = parseEnexFile({ data: Buffer.from('dummy'), hash: 'a'.repeat(64) });

    expect(result.importId).toBe('import-1');
    expect(checkpointSpy).toHaveBeenCalledTimes(1);
  });

  it('does not flush WAL checkpoint when ENEX parse fails', () => {
    const checkpointSpy = vi
      .spyOn(importSessionRepository, 'checkpointImportDatabaseWal')
      .mockImplementation(() => {});

    vi.spyOn(importSessionRepository, 'findImportIdByHash').mockReturnValue(undefined);
    vi.spyOn(importSessionRepository, 'getImportSession').mockReturnValue(undefined);
    vi.spyOn(importSessionRepository, 'saveImportSession').mockImplementation(() => {
      throw new Error('should not be called');
    });
    vi.spyOn(enexParserService, 'parseEnex').mockReturnValue({
      ok: false,
      error: {
        code: 'INVALID_ENEX',
        message: 'parse failed'
      },
      warnings: []
    });

    expect(() => parseEnexFile({ data: Buffer.from('<invalid>'), hash: 'b'.repeat(64) })).toThrow(
      EnexParseError
    );
    expect(checkpointSpy).not.toHaveBeenCalled();
  });
});
