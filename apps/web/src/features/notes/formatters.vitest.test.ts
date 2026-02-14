import { describe, expect, it } from 'vitest';

import { formatResourceLabel, formatSummaryTimestamp, formatTimestamp } from './formatters';

describe('formatTimestamp', () => {
  it('returns placeholder for empty values', () => {
    expect(formatTimestamp()).toBe('—');
    expect(formatTimestamp(null)).toBe('—');
  });

  it('returns the raw value for invalid dates', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });

  it('leaves ISO timestamps as-is', () => {
    expect(formatTimestamp('2024-01-02T03:04:05')).toBe('2024-01-02T03:04:05');
  });

  it('formats Evernote compact timestamps', () => {
    expect(formatTimestamp('20240102T030405Z')).toBe('2024-01-02 03:04:05');
  });
});

describe('formatResourceLabel', () => {
  it('prefers file name', () => {
    expect(formatResourceLabel({ id: 'resource-1', fileName: 'image.png' })).toBe('image.png');
  });

  it('falls back to mime type', () => {
    expect(formatResourceLabel({ id: 'resource-2', mime: 'image/png' })).toBe('image/png');
  });

  it('falls back to id', () => {
    expect(formatResourceLabel({ id: 'resource-3' })).toBe('resource-3');
  });
});

describe('formatSummaryTimestamp', () => {
  it('returns placeholder for empty values', () => {
    expect(formatSummaryTimestamp()).toBe('—');
    expect(formatSummaryTimestamp(null)).toBe('—');
  });

  it('returns the raw value for invalid dates', () => {
    expect(formatSummaryTimestamp('not-a-date')).toBe('not-a-date');
  });

  it('leaves ISO timestamps as-is', () => {
    expect(formatSummaryTimestamp('2024-01-02T03:04:05')).toBe('2024-01-02T03:04:05');
  });

  it('formats Evernote compact timestamps', () => {
    expect(formatSummaryTimestamp('20240102T030405Z')).toBe('2024-01-02 03:04:05');
  });
});
