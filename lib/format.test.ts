import { describe, expect, it } from 'vitest';
import { formatNum, localDateStr } from './format';

describe('formatNum', () => {
  it('renders null and undefined as 0', () => {
    expect(formatNum(null)).toBe('0');
    expect(formatNum(undefined)).toBe('0');
    expect(formatNum(0)).toBe('0');
  });

  it('formats numbers the way ms-MY does', () => {
    expect(formatNum(1234567)).toBe(new Intl.NumberFormat('ms-MY').format(1234567));
    expect(formatNum(99000)).toBe(new Intl.NumberFormat('ms-MY').format(99000));
  });
});

describe('localDateStr', () => {
  it('formats a locally-constructed date as YYYY-MM-DD', () => {
    expect(localDateStr(new Date(2026, 9, 5, 1, 30))).toBe('2026-10-05');
    expect(localDateStr(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });

  it('pads month and day', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateStr(new Date(2026, 11, 31, 12))).toBe('2026-12-31');
  });

  it('stays on the same day at midnight, where toISOString() may not', () => {
    const midnight = new Date(2026, 0, 1, 0, 0);
    expect(localDateStr(midnight)).toBe('2026-01-01');
    // The bug #11 fixed: toISOString() reports UTC, so on any non-UTC clock
    // the early hours belong to the previous UTC day.
    if (midnight.getTimezoneOffset() !== 0) {
      expect(midnight.toISOString().slice(0, 10)).toBe('2025-12-31');
    }
  });

  it('defaults to today in local time', () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(localDateStr()).toBe(
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    );
  });

  it('always matches the zero-padded shape', () => {
    expect(localDateStr(new Date(2026, 9, 5, 1, 30))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
