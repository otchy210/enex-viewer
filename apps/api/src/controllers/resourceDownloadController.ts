import { spawn } from 'child_process';
import { rmSync } from 'fs';
import { pipeline } from 'stream';

import {
  fetchResourceDownload,
  prepareBulkDownload
} from '../services/resourceDownloadService.js';

import type { Request, Response } from 'express';

interface BulkDownloadRequestBody {
  resources?: { noteId?: unknown; resourceId?: unknown }[];
}

const encodeContentDisposition = (fileName: string): string => {
  const escaped = fileName.replace(/"/g, '\\"');
  const utf8 = encodeURIComponent(fileName);
  return `attachment; filename="${escaped}"; filename*=UTF-8''${utf8}`;
};

export const resourceDownloadController = (req: Request, res: Response): void => {
  const { importId, noteId, resourceId } = req.params;
  const result = fetchResourceDownload(importId, noteId, resourceId);

  if (!result.ok) {
    res.status(404).json({
      code: result.code,
      message: result.message
    });
    return;
  }

  res.setHeader('Content-Type', result.mime);
  if (typeof result.size === 'number') {
    res.setHeader('Content-Length', String(result.size));
  }
  res.setHeader('Content-Disposition', encodeContentDisposition(result.fileName));

  pipeline(result.stream, res, (error) => {
    if (error && !res.headersSent) {
      res.status(500).json({
        code: 'RESOURCE_DOWNLOAD_FAILED',
        message: 'Failed to stream resource.'
      });
    }
  });
};

export const resourceBulkDownloadController = (req: Request, res: Response): void => {
  const importId = req.params.importId;
  const body = req.body as BulkDownloadRequestBody;
  const resources = Array.isArray(body.resources) ? body.resources : undefined;

  if (!resources || resources.length === 0) {
    res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'resources must be a non-empty array.'
    });
    return;
  }

  const normalized = resources
    .map((entry) => ({
      noteId: typeof entry.noteId === 'string' ? entry.noteId.trim() : '',
      resourceId: typeof entry.resourceId === 'string' ? entry.resourceId.trim() : ''
    }))
    .filter((entry) => entry.noteId.length > 0 && entry.resourceId.length > 0);

  if (normalized.length !== resources.length) {
    res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'Each resources entry must include noteId and resourceId.'
    });
    return;
  }

  const staging = prepareBulkDownload(importId, normalized);
  if (!staging.ok) {
    res.status(404).json({
      code: staging.code,
      message: staging.message
    });
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="import-${importId}-resources.zip"`);

  const zipProcess = spawn('zip', ['-q', '-r', '-', '.'], {
    cwd: staging.stagingDirectory,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  zipProcess.on('error', () => {
    rmSync(staging.stagingDirectory, { recursive: true, force: true });
    if (!res.headersSent) {
      res.status(500).json({
        code: 'ZIP_GENERATION_FAILED',
        message: 'Failed to generate zip archive.'
      });
    }
  });

  zipProcess.on('close', (code) => {
    rmSync(staging.stagingDirectory, { recursive: true, force: true });
    if (code !== 0 && !res.writableEnded) {
      res.status(500).json({
        code: 'ZIP_GENERATION_FAILED',
        message: 'Failed to generate zip archive.'
      });
    }
  });

  pipeline(zipProcess.stdout, res, (error) => {
    if (error) {
      zipProcess.kill('SIGKILL');
      rmSync(staging.stagingDirectory, { recursive: true, force: true });
    }
  });
};
