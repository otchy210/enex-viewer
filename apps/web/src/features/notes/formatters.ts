import type { NoteDetail } from '../../api/notes';

const parseTimestamp = (value?: string | null): Date | string | null => {
  if (value == null || value.length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed);
};

export const formatTimestamp = (value?: string | null): string => {
  const parsed = parseTimestamp(value);
  if (parsed == null) {
    return '—';
  }
  if (typeof parsed === 'string') {
    return parsed;
  }
  return parsed.toLocaleString();
};

export const formatSummaryTimestamp = (value?: string | null): string => {
  const parsed = parseTimestamp(value);
  if (parsed == null) {
    return '—';
  }
  if (typeof parsed === 'string') {
    return parsed;
  }
  return parsed.toLocaleDateString();
};

export const formatResourceLabel = (resource: NoteDetail['resources'][number]): string => {
  if (resource.fileName != null && resource.fileName.length > 0) {
    return resource.fileName;
  }
  if (resource.mime != null && resource.mime.length > 0) {
    return resource.mime;
  }
  return resource.id;
};
