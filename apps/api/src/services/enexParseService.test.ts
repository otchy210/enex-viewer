import { rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

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

  it('accepts filePath payload for parseEnexFile', () => {
    const checkpointSpy = vi
      .spyOn(importSessionRepository, 'checkpointImportDatabaseWal')
      .mockImplementation(() => {});

    vi.spyOn(importSessionRepository, 'findImportIdByHash').mockReturnValue('import-2');
    vi.spyOn(importSessionRepository, 'getImportSession').mockReturnValue({
      id: 'import-2',
      hash: 'c'.repeat(64),
      createdAt: '2026-01-01T00:00:00.000Z',
      noteCount: 2,
      warnings: [],
      notes: [],
      noteListIndex: []
    });

    const filePath = path.join(os.tmpdir(), `enex-viewer-service-test-${Date.now()}.enex`);
    writeFileSync(filePath, Buffer.from('dummy-file'));

    try {
      const result = parseEnexFile({ filePath, hash: 'c'.repeat(64) });

      expect(result.importId).toBe('import-2');
      expect(checkpointSpy).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(filePath, { force: true });
    }
  });

  it('saves streamed notes incrementally when parsing from filePath', () => {
    vi.spyOn(importSessionRepository, 'findImportIdByHash').mockReturnValue(undefined);
    vi.spyOn(importSessionRepository, 'getImportSession').mockReturnValue(undefined);
    vi.spyOn(importSessionRepository, 'checkpointImportDatabaseWal').mockImplementation(() => {});

    const saveSpy = vi
      .spyOn(importSessionRepository, 'saveImportSession')
      .mockImplementation((session) => session.id);

    vi.spyOn(enexParserService, 'parseEnexFileByNote').mockImplementation((_filePath, onNote) => {
      onNote({
        id: 'note-1',
        title: 'One',
        tags: [],
        content: '<en-note>one</en-note>',
        resources: []
      });
      onNote({
        id: 'note-2',
        title: 'Two',
        tags: [],
        content: '<en-note>two</en-note>',
        resources: []
      });
      return { ok: true, noteCount: 2, warnings: [] };
    });

    const result = parseEnexFile({ filePath: '/tmp/mock.enex', hash: 'd'.repeat(64) });

    expect(result.noteCount).toBe(2);
    expect(saveSpy).toHaveBeenCalledTimes(3);
    expect(saveSpy.mock.calls[0]?.[0].notes).toHaveLength(1);
    expect(saveSpy.mock.calls[1]?.[0].notes).toHaveLength(1);
    expect(saveSpy.mock.calls[2]?.[0].noteCount).toBe(2);
  });


  it('cleans up partial import and files when streamed parsing fails after partial progress', () => {
    vi.spyOn(importSessionRepository, 'findImportIdByHash').mockReturnValue(undefined);
    vi.spyOn(importSessionRepository, 'getImportSession').mockReturnValue(undefined);
    vi.spyOn(importSessionRepository, 'checkpointImportDatabaseWal').mockImplementation(() => {});

    const saveSpy = vi
      .spyOn(importSessionRepository, 'saveImportSession')
      .mockImplementation((session) => session.id);
    const deleteSpy = vi
      .spyOn(importSessionRepository, 'deleteImportSessionById')
      .mockImplementation(() => {});

    vi.spyOn(enexParserService, 'parseEnexFileByNote').mockImplementation((_filePath, onNote) => {
      onNote({
        id: 'note-1',
        title: 'One',
        tags: [],
        content: '<en-note>one</en-note>',
        resources: [
          {
            id: 'resource-1-1',
            size: 1,
            data: Buffer.from('a')
          }
        ]
      });

      return {
        ok: false,
        error: {
          code: 'INVALID_XML',
          message: 'broken xml'
        },
        warnings: []
      };
    });

    expect(() => parseEnexFile({ filePath: '/tmp/mock.enex', hash: 'e'.repeat(64) })).toThrow(EnexParseError);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('propagates onNote callback errors from parseEnexFileByNote', () => {
    const filePath = path.join(os.tmpdir(), `enex-stream-error-${Date.now()}.enex`);
    writeFileSync(
      filePath,
      `<?xml version="1.0" encoding="UTF-8"?><en-export><note><title>A</title><content><![CDATA[<en-note>one</en-note>]]></content></note></en-export>`
    );

    try {
      expect(() =>
        enexParserService.parseEnexFileByNote(filePath, () => {
          throw new Error('disk full');
        })
      ).toThrow('disk full');
    } finally {
      rmSync(filePath, { force: true });
    }
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
