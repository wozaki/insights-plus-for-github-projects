import { describe, it, expect } from 'vitest';
import { evaluate, DEFAULT_AGE_THRESHOLDS } from '../alert-evaluator';
import type { StatusCategory } from '../types';

const TODAY = '2026-07-18';

function run(overrides: Partial<{ startDate: string | null; endDate: string | null; status: StatusCategory }>) {
  return evaluate({
    startDate: null,
    endDate: null,
    status: 'unknown',
    today: TODAY,
    ...overrides,
  });
}

describe('evaluate - Start cell', () => {
  it('flags Missing Start when in progress without a start date', () => {
    const result = run({ status: 'inProgress', startDate: null });
    expect(result.start).toEqual({ type: 'missingStart', text: '⚠ Missing', level: 'caution' });
  });

  it('does not flag Missing Start for todo without a start date', () => {
    expect(run({ status: 'todo', startDate: null }).start).toBeNull();
  });

  it('shows Age with normal level for a recent start (<=5d)', () => {
    const result = run({ status: 'inProgress', startDate: '2026-07-15' });
    expect(result.start).toEqual({ type: 'age', text: 'Age 3d', level: 'normal' });
  });

  it('shows Age with caution level at the caution threshold (6d)', () => {
    const result = run({ status: 'inProgress', startDate: '2026-07-12' });
    expect(result.start).toEqual({ type: 'age', text: 'Age 6d', level: 'caution' });
  });

  it('shows Age with warning level at the warning threshold (11d)', () => {
    const result = run({ status: 'inProgress', startDate: '2026-07-07' });
    expect(result.start).toEqual({ type: 'age', text: 'Age 11d', level: 'warning' });
  });

  it('does not show Age for done items', () => {
    expect(run({ status: 'done', startDate: '2026-07-01' }).start).toBeNull();
  });

  it('does not show Age when the start date is in the future (Future Start is post-MVP)', () => {
    expect(run({ status: 'inProgress', startDate: '2026-07-25' }).start).toBeNull();
  });

  it('shows Age 0d on the start day itself', () => {
    const result = run({ status: 'inProgress', startDate: TODAY });
    expect(result.start).toEqual({ type: 'age', text: 'Age 0d', level: 'normal' });
  });

  it('does not show Age for todo items (Age tracks in-progress work only)', () => {
    expect(run({ status: 'todo', startDate: '2026-07-01' }).start).toBeNull();
  });

  it('stays silent for unknown status', () => {
    expect(run({ status: 'unknown', startDate: '2026-07-01' }).start).toBeNull();
  });
});

describe('evaluate - End cell', () => {
  it('flags Overdue when not done and the end date is in the past', () => {
    const result = run({ status: 'inProgress', endDate: '2026-07-15' });
    expect(result.end).toEqual({ type: 'overdue', text: 'Overdue 3d', level: 'warning' });
  });

  it('does not flag Overdue on the due day itself', () => {
    expect(run({ status: 'inProgress', endDate: TODAY }).end).toBeNull();
  });

  it('does not flag Overdue for a future end date', () => {
    expect(run({ status: 'inProgress', endDate: '2026-07-21' }).end).toBeNull();
  });

  it('does not flag Overdue for done items', () => {
    expect(run({ status: 'done', endDate: '2026-07-15' }).end).toBeNull();
  });

  it('flags Overdue for a todo item past its end date (not-done includes todo)', () => {
    const result = run({ status: 'todo', endDate: '2026-07-15' });
    expect(result.end).toEqual({ type: 'overdue', text: 'Overdue 3d', level: 'warning' });
  });

  it('flags Missing End when done without an end date', () => {
    const result = run({ status: 'done', endDate: null, startDate: '2026-07-01' });
    expect(result.end).toEqual({ type: 'missingEnd', text: '⚠ Missing', level: 'caution' });
  });

  it('flags Missing End when in progress without an end date (no target to check overdue against)', () => {
    const result = run({ status: 'inProgress', endDate: null, startDate: '2026-07-01' });
    expect(result.end).toEqual({ type: 'missingEnd', text: '⚠ Missing', level: 'caution' });
  });

  it('does not flag Missing End for todo items (not yet planned)', () => {
    expect(run({ status: 'todo', endDate: null }).end).toBeNull();
  });
});

describe('evaluate - combined & priorities', () => {
  it('emits independent Start Age and End Overdue for an in-progress overdue item', () => {
    const result = run({ status: 'inProgress', startDate: '2026-07-10', endDate: '2026-07-17' });
    expect(result.start).toEqual({ type: 'age', text: 'Age 8d', level: 'caution' });
    expect(result.end).toEqual({ type: 'overdue', text: 'Overdue 1d', level: 'warning' });
  });

  it('prioritizes Missing Start over Age when start is empty and in progress', () => {
    const result = run({ status: 'inProgress', startDate: null, endDate: null });
    expect(result.start?.type).toBe('missingStart');
  });

  it('emits no alerts for a fully completed item', () => {
    const result = run({ status: 'done', startDate: '2026-07-01', endDate: '2026-07-10' });
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it('honors custom age thresholds', () => {
    const result = evaluate({
      startDate: '2026-07-16',
      endDate: null,
      status: 'inProgress',
      today: TODAY,
      ageThresholds: { caution: 2, warning: 3 },
    });
    expect(result.start).toEqual({ type: 'age', text: 'Age 2d', level: 'caution' });
  });

  it('exposes sane default thresholds', () => {
    expect(DEFAULT_AGE_THRESHOLDS).toEqual({ caution: 6, warning: 11 });
  });
});
