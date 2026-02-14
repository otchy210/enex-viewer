import type { NoteDetail } from '../../api/notes';

const EVERNOTE_TIMESTAMP = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

const formatEvernoteTimestamp = (value: string): string | null => {
  const match = EVERNOTE_TIMESTAMP.exec(value);
  if (match == null) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const formatNoteTimestamp = (raw?: string | null): string => {
  if (raw == null) {
    return '—';
  }
  const value = raw.trim();
  if (value.length === 0) {
    return '—';
  }
  const formatted = formatEvernoteTimestamp(value);
  if (formatted != null) {
    return formatted;
  }
  return value;
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
