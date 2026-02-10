import type { NoteDetail } from '../../api/notes';

const parseTimestamp = (value?: string | null): Date | string | null => {
  if (!value) {
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
  if (!parsed) {
    return '—';
  }
  if (typeof parsed === 'string') {
    return parsed;
  }
  return parsed.toLocaleString();
};

export const formatSummaryTimestamp = (value?: string | null): string => {
  const parsed = parseTimestamp(value);
  if (!parsed) {
    return '—';
  }
  if (typeof parsed === 'string') {
    return parsed;
  }
  return parsed.toLocaleDateString();
};

export const formatResourceLabel = (resource: NoteDetail['resources'][number]): string => {
  if (resource.fileName) {
    return resource.fileName;
  }
  if (resource.mime) {
    return resource.mime;
  }
  return resource.id;
};
