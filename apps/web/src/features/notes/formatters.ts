import { formatLocalDateTime } from '../../lib/dateTime';

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

const formatNoteTimestamp = (value?: string | null): string => {
  const parsed = parseTimestamp(value);
  if (parsed == null) {
    return '—';
  }
  if (typeof parsed === 'string') {
    return parsed;
  }
  return formatLocalDateTime(parsed);
};

export const formatTimestamp = (value?: string | null): string => formatNoteTimestamp(value);

export const formatSummaryTimestamp = (value?: string | null): string => formatNoteTimestamp(value);

export const formatResourceLabel = (resource: NoteDetail['resources'][number]): string => {
  if (resource.fileName != null && resource.fileName.length > 0) {
    return resource.fileName;
  }
  if (resource.mime != null && resource.mime.length > 0) {
    return resource.mime;
  }
  return resource.id;
};
