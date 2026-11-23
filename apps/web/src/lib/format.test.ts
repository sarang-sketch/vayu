import { describe, expect, it } from 'vitest';
import { formatDateTime, formatNumber, relativeTime } from './format';

describe('formatNumber', () => {
  it('formats with Indian locale grouping', () => {
    expect(formatNumber(1234.567, 2)).toBe('1,234.57');
    expect(formatNumber(100000)).toBe('1,00,000');
  });

  it('rounds to the requested precision', () => {
    expect(formatNumber(8.4123, 1)).toBe('8.4');
  });
});

describe('relativeTime', () => {
  const base = new Date('2026-11-23T08:00:00Z').getTime();

  it('renders minutes, hours and days', () => {
    expect(relativeTime('2026-11-23T07:58:00Z', base)).toBe('2 min ago');
    expect(relativeTime('2026-11-23T06:00:00Z', base)).toBe('2 h ago');
    expect(relativeTime('2026-11-21T08:00:00Z', base)).toBe('2 d ago');
  });

  it('handles just-now and invalid input', () => {
    expect(relativeTime('2026-11-23T08:00:00Z', base)).toBe('just now');
    expect(relativeTime('not-a-date', base)).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('returns a dash for invalid dates', () => {
    expect(formatDateTime('garbage')).toBe('—');
  });

  it('formats valid ISO timestamps', () => {
    expect(formatDateTime('2026-11-23T08:00:00Z')).toMatch(/23/);
  });
});
