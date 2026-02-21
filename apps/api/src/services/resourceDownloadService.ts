import { createReadStream, existsSync, mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'fs';
import os from 'os';
import path from 'path';

import {
  getStoredResource,
  listStoredResourcesByIds
} from '../repositories/importSessionRepository.js';

export interface ResourceDownloadResult {
  ok: true;
  fileName: string;
  mime: string;
  size?: number;
  stream: NodeJS.ReadableStream;
}

export interface ResourceDownloadError {
  ok: false;
  code: 'RESOURCE_NOT_FOUND';
  message: string;
}

export const fetchResourceDownload = (
  importId: string,
  noteId: string,
  resourceId: string
): ResourceDownloadResult | ResourceDownloadError => {
  const resource = getStoredResource(importId, noteId, resourceId);
  if (resource === undefined) {
    return {
      ok: false,
      code: 'RESOURCE_NOT_FOUND',
      message: 'Resource not found.'
    };
  }

  const storagePath = resource.storagePath;
  if (storagePath === undefined || storagePath.length === 0 || !existsSync(storagePath)) {
    return {
      ok: false,
      code: 'RESOURCE_NOT_FOUND',
      message: 'Resource not found.'
    };
  }

  return {
    ok: true,
    fileName: resource.fileName ?? `${resource.id}.bin`,
    mime: resource.mime ?? 'application/octet-stream',
    size: resource.size,
    stream: createReadStream(storagePath)
  };
};

export interface BulkDownloadSelection {
  noteId: string;
  resourceId: string;
}

export interface BulkDownloadPreparation {
  ok: true;
  stagingDirectory: string;
}

export interface BulkDownloadError {
  ok: false;
  code: 'RESOURCE_NOT_FOUND';
  message: string;
}

export const prepareBulkDownload = (
  importId: string,
  selections: BulkDownloadSelection[]
): BulkDownloadPreparation | BulkDownloadError => {
  const resources = listStoredResourcesByIds(importId, selections);
  if (resources.length !== selections.length) {
    return {
      ok: false,
      code: 'RESOURCE_NOT_FOUND',
      message: 'One or more resources were not found.'
    };
  }

  const stagingDirectory = mkdtempSync(path.join(os.tmpdir(), `enex-viewer-${importId}-`));

  for (const resource of resources) {
    if (
      resource.storagePath === undefined ||
      resource.storagePath.length === 0 ||
      !existsSync(resource.storagePath)
    ) {
      rmSync(stagingDirectory, { recursive: true, force: true });
      return {
        ok: false,
        code: 'RESOURCE_NOT_FOUND',
        message: 'One or more resources were not found.'
      };
    }

    const noteDirectory = path.join(stagingDirectory, resource.noteId);
    mkdirSync(noteDirectory, { recursive: true });
    const trimmedFileName = resource.fileName?.trim();
    const fileName =
      trimmedFileName !== undefined && trimmedFileName.length > 0
        ? trimmedFileName
        : `${resource.noteId}-${resource.id}.bin`;
    const linkPath = path.join(noteDirectory, fileName);
    symlinkSync(resource.storagePath, linkPath);
  }

  return { ok: true, stagingDirectory };
};
