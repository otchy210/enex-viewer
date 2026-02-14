import { describe, expect, it } from 'vitest';

import { formatLocalDateTime } from './dateTime';

describe('formatLocalDateTime', () => {
  it('formats each date-time segment in yyyy-MM-dd HH:mm:ss', () => {
    const date = new Date(2024, 0, 2, 3, 4, 5);

    expect(formatLocalDateTime(date)).toBe('2024-01-02 03:04:05');
  });

  it('zero-pads month/day/hour/minute/second', () => {
    const date = new Date(2024, 8, 9, 7, 6, 5);

    expect(formatLocalDateTime(date)).toBe('2024-09-09 07:06:05');
  });
});
