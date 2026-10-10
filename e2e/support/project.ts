// The public fixture project the e2e tests run against.
// Setup of the charts, view and issues is documented in e2e/README.md.

export const PROJECT = {
  owner: 'wozaki',
  number: 4,
  url: 'https://github.com/users/wozaki/projects/4',
};

export const CHARTS = {
  velocity: 'e2e: velocity',
  burnupPrediction: 'e2e: burnup prediction',
  burnupPeriodWarning: 'e2e: burnup period warning',
  burnupXAxisWarning: 'e2e: burnup x-axis warning',
} as const;

export const DATE_ALERTS_VIEW = 'e2e: date alerts';

/** Fail early when the prediction chart's custom range ends within this many days. */
export const MIN_DAYS_UNTIL_CHART_END = 30;

type Level = 'normal' | 'caution' | 'warning';

export interface ExpectedAlert {
  text: string;
  level: Level;
}

export interface DateAlertItem {
  /** Issue number in wozaki/sandbox-issue. */
  issue: number;
  title: string;
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  /** Days relative to today, or null to leave the field empty. */
  start: number | null;
  end: number | null;
  expected: { start: ExpectedAlert | null; end: ExpectedAlert | null };
}

// Age thresholds: >= 6 days is caution, >= 11 days is warning.
export const DATE_ALERT_ITEMS: DateAlertItem[] = [
  {
    issue: 58,
    title: '[e2e] In progress, age normal',
    status: 'In Progress',
    start: -2,
    end: 5,
    expected: { start: { text: 'Age 2d', level: 'normal' }, end: null },
  },
  {
    issue: 59,
    title: '[e2e] In progress, age caution',
    status: 'In Progress',
    start: -8,
    end: 3,
    expected: { start: { text: 'Age 8d', level: 'caution' }, end: null },
  },
  {
    issue: 60,
    title: '[e2e] In progress, age warning and overdue',
    status: 'In Progress',
    start: -15,
    end: -3,
    expected: {
      start: { text: 'Age 15d', level: 'warning' },
      end: { text: 'Overdue 3d', level: 'warning' },
    },
  },
  {
    issue: 61,
    title: '[e2e] In progress, missing dates',
    status: 'In Progress',
    start: null,
    end: null,
    expected: {
      start: { text: '⚠ Missing', level: 'caution' },
      end: { text: '⚠ Missing', level: 'caution' },
    },
  },
  {
    issue: 62,
    title: '[e2e] In review, age caution',
    status: 'Review',
    start: -7,
    end: 2,
    expected: { start: { text: 'Age 7d', level: 'caution' }, end: null },
  },
  {
    issue: 63,
    title: '[e2e] Todo, no alerts',
    status: 'Todo',
    start: null,
    end: null,
    expected: { start: null, end: null },
  },
  {
    // Saving the config also saves the In Progress/Done status lists; Todo is
    // in neither, so it is unclassified and gets no Overdue alert.
    issue: 64,
    title: '[e2e] Todo past end date, no alerts',
    status: 'Todo',
    start: null,
    end: -2,
    expected: { start: null, end: null },
  },
  {
    issue: 65,
    title: '[e2e] Done, no alerts',
    status: 'Done',
    start: -10,
    end: -1,
    expected: { start: null, end: null },
  },
  {
    issue: 66,
    title: '[e2e] Done, missing end',
    status: 'Done',
    start: -10,
    end: null,
    expected: { start: null, end: { text: '⚠ Missing', level: 'caution' } },
  },
];

export const FIXTURE_REPO = { owner: 'wozaki', name: 'sandbox-issue' };

/** Local-time 'YYYY-MM-DD' offset from today, matching the extension's notion of "today". */
export function dateFromToday(offsetDays: number, now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
