import type { NoteDetail } from '../../api/notes';

export const formatTimestamp = (value?: string | null): string => {
  if (!value) {
    return '—';
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
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
