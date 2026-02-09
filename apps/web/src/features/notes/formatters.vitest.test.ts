import { describe, expect, it } from 'vitest';

import { formatResourceLabel, formatTimestamp } from './formatters';

describe('formatTimestamp', () => {
  it('returns placeholder for empty values', () => {
    expect(formatTimestamp()).toBe('—');
    expect(formatTimestamp(null)).toBe('—');
  });

  it('returns the raw value for invalid dates', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });

  it('formats valid dates', () => {
    expect(formatTimestamp('2024-01-01T00:00:00Z')).toContain('2024');
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
