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
  if (storagePath == null || storagePath.length === 0 || !existsSync(storagePath)) {
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

const INVALID_DIRECTORY_CHARACTERS = /[\\/:*?"<>|\u0000-\u001F\u007F]/g;
const INVALID_FILE_NAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001F\u007F]/g;
const MULTI_SPACE = /\s+/g;
const MAX_NOTE_DIRECTORY_NAME_LENGTH = 80;

const sanitizeNoteDirectoryName = (title: string | undefined, fallbackNoteId: string): string => {
  const trimmed =
    title
      ?.replace(INVALID_DIRECTORY_CHARACTERS, '')
      .replace(MULTI_SPACE, ' ')
      .trim() ?? '';
  const normalized = trimmed.slice(0, MAX_NOTE_DIRECTORY_NAME_LENGTH).trim();

  if (normalized.length > 0) {
    return normalized;
  }

  return `note-${fallbackNoteId}`;
};

const resolveUniqueNoteDirectoryName = (
  baseName: string,
  usedNames: Set<string>,
  maxLength: number
): string => {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  let suffixNumber = 1;
  while (true) {
    const suffix = `-${suffixNumber}`;
    const limitedBase = baseName.slice(0, Math.max(1, maxLength - suffix.length)).trim();
    const candidate = `${limitedBase}${suffix}`;

    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    suffixNumber += 1;
  }
};

const sanitizeResourceFileName = (
  fileName: string | null | undefined,
  fallbackFileName: string
): string => {
  const trimmed = fileName?.trim();
  const baseName =
    trimmed !== undefined && trimmed.length > 0 ? path.basename(trimmed) : fallbackFileName;
  const normalized = baseName.replace(INVALID_FILE_NAME_CHARACTERS, '').trim();

  return normalized.length > 0 ? normalized : fallbackFileName;
};

const resolveUniqueFileName = (fileName: string, usedNames: Set<string>): string => {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const extension = path.extname(fileName);
  const baseName = extension.length > 0 ? fileName.slice(0, -extension.length) : fileName;
  let suffixNumber = 1;

  while (true) {
    const candidate = `${baseName}-${suffixNumber}${extension}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    suffixNumber += 1;
  }
};

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
  const noteDirectories = new Map<string, string>();
  const usedDirectoryNames = new Set<string>();
  const usedFileNamesByDirectory = new Map<string, Set<string>>();

  for (const resource of resources) {
    if (
      resource.storagePath == null ||
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

    let noteDirectoryName = noteDirectories.get(resource.noteId);
    if (noteDirectoryName === undefined) {
      const baseDirectoryName = sanitizeNoteDirectoryName(resource.noteTitle, resource.noteId);
      noteDirectoryName = resolveUniqueNoteDirectoryName(
        baseDirectoryName,
        usedDirectoryNames,
        MAX_NOTE_DIRECTORY_NAME_LENGTH
      );
      noteDirectories.set(resource.noteId, noteDirectoryName);
    }

    const noteDirectory = path.join(stagingDirectory, noteDirectoryName);
    mkdirSync(noteDirectory, { recursive: true });
    const baseFileName = sanitizeResourceFileName(
      resource.fileName,
      `${resource.noteId}-${resource.id}.bin`
    );
    const usedFileNames = usedFileNamesByDirectory.get(noteDirectoryName) ?? new Set<string>();
    usedFileNamesByDirectory.set(noteDirectoryName, usedFileNames);
    const fileName = resolveUniqueFileName(baseFileName, usedFileNames);
    const linkPath = path.join(noteDirectory, fileName);
    symlinkSync(resource.storagePath, linkPath);
  }

  return { ok: true, stagingDirectory };
};
