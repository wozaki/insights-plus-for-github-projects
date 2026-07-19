import { describe, it, expect } from 'vitest';
import { toDateOnly, diffInDays, todayDateOnly } from '../date-utils';

describe('toDateOnly', () => {
  it('extracts the date part from an ISO datetime with offset', () => {
    expect(toDateOnly('2026-07-19T00:00:00+00:00')).toBe('2026-07-19');
  });

  it('passes through a plain date-only string', () => {
    expect(toDateOnly('2026-07-19')).toBe('2026-07-19');
  });

  it('returns null for null/undefined/empty', () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeNull();
    expect(toDateOnly('')).toBeNull();
  });

  it('returns null for unparseable input', () => {
    expect(toDateOnly('not a date')).toBeNull();
  });

  it('normalizes a Date via its UTC parts', () => {
    expect(toDateOnly(new Date(Date.UTC(2026, 6, 5)))).toBe('2026-07-05');
  });
});

describe('diffInDays', () => {
  it('returns positive when a is later than b', () => {
    expect(diffInDays('2026-07-18', '2026-07-15')).toBe(3);
  });

  it('returns negative when a is earlier than b', () => {
    expect(diffInDays('2026-07-15', '2026-07-18')).toBe(-3);
  });

  it('returns 0 for the same day', () => {
    expect(diffInDays('2026-07-18', '2026-07-18')).toBe(0);
  });

  it('spans month boundaries correctly', () => {
    expect(diffInDays('2026-08-01', '2026-07-31')).toBe(1);
  });

  it('returns null when either side is invalid', () => {
    expect(diffInDays('2026-07-18', null)).toBeNull();
    expect(diffInDays('bad', '2026-07-18')).toBeNull();
  });
});

describe('todayDateOnly', () => {
  it('formats the given local date as YYYY-MM-DD', () => {
    expect(todayDateOnly(new Date(2026, 6, 8))).toBe('2026-07-08');
  });
});
