// The public fixture project the e2e tests run against.
// Setup of the charts, view and issues is documented in e2e/README.md.

import type { AlertLevel } from '../../src/entrypoints/date-alerts.content/types';

export const PROJECT = {
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

export interface ExpectedAlert {
  text: string | RegExp;
  level: AlertLevel;
}

export interface DateAlertItem {
  title: string;
  expected: { start: ExpectedAlert | null; end: ExpectedAlert | null };
}

// Fixture issues (label `e2e` in wozaki/sandbox-issue) have fixed dates chosen
// so their alerts never change over time: starts long ago (always Age warning),
// ends long ago (always Overdue) or far in the future (never Overdue), or empty.
// The values are listed in e2e/README.md. Age and Overdue counts grow daily,
// so only their shape is checked; thresholds are covered by unit tests.
const AGE: ExpectedAlert = { text: /^Age \d+d$/, level: 'warning' };
const OVERDUE: ExpectedAlert = { text: /^Overdue \d+d$/, level: 'warning' };
const MISSING: ExpectedAlert = { text: '⚠ Missing', level: 'caution' };

export const DATE_ALERT_ITEMS: DateAlertItem[] = [
  { title: '[e2e] In progress, age warning', expected: { start: AGE, end: null } },
  { title: '[e2e] In progress, age warning and overdue', expected: { start: AGE, end: OVERDUE } },
  { title: '[e2e] In progress, missing dates', expected: { start: MISSING, end: MISSING } },
  { title: '[e2e] In progress, missing start', expected: { start: MISSING, end: null } },
  // Review counts as in progress.
  { title: '[e2e] In review, age warning', expected: { start: AGE, end: null } },
  { title: '[e2e] Todo, no alerts', expected: { start: null, end: null } },
  // Saving the config also saves the In Progress/Done status lists; Todo is
  // in neither, so it is unclassified and gets no Overdue alert.
  { title: '[e2e] Todo past end date, no alerts', expected: { start: null, end: null } },
  { title: '[e2e] Done, no alerts', expected: { start: null, end: null } },
  { title: '[e2e] Done, missing end', expected: { start: null, end: MISSING } },
];
