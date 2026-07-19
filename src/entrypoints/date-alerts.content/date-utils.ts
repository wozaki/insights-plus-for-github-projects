// Date Field Alerts - Date Utilities
// Responsibility: day-granular date math that is timezone-stable.
// All functions operate on date-only strings 'YYYY-MM-DD' to avoid TZ drift.

/**
 * Normalize an input date value (ISO string like '2026-07-19T00:00:00+00:00',
 * a plain 'YYYY-MM-DD', or a Date) to a date-only 'YYYY-MM-DD' string.
 * Returns null when the value is empty or unparseable.
 */
export function toDateOnly(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Whole-day difference (a - b) between two date-only strings.
 * Positive when `a` is later than `b`. Returns null if either is invalid.
 */
export function diffInDays(a: string | null, b: string | null): number | null {
  const ta = dateOnlyToUtc(a);
  const tb = dateOnlyToUtc(b);
  if (ta === null || tb === null) return null;
  return Math.round((ta - tb) / 86_400_000);
}

/** Today's local date as a 'YYYY-MM-DD' string. */
export function todayDateOnly(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function dateOnlyToUtc(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
