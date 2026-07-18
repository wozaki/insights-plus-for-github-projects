// Date Field Alerts - Alert Evaluator
// Responsibility: pure evaluation of which annotation (if any) each date cell gets.
// Implements the MVP subset of the spec's Status display rules and priorities.

import type { AlertLevel, CellAlert, EvaluationResult, ItemFieldData, StatusCategory } from './types';
import { diffInDays } from './date-utils';

/** Age thresholds (in days). 0..caution-1 = normal, caution..warning-1 = caution, >=warning = warning. */
export interface AgeThresholds {
  caution: number;
  warning: number;
}

export const DEFAULT_AGE_THRESHOLDS: AgeThresholds = { caution: 6, warning: 11 };

export interface EvaluateInput {
  startDate: string | null;
  endDate: string | null;
  status: StatusCategory;
  /** Today as 'YYYY-MM-DD'. */
  today: string;
  ageThresholds?: AgeThresholds;
}

/**
 * Evaluate the Start and End cell annotations for a single item.
 *
 * MVP alerts and their priority (highest first):
 * - Start cell: Missing Start -> Age
 * - End cell:   Overdue -> Missing End
 *
 * Post-MVP alerts (Future Start, Due Soon, Due Today) are intentionally not emitted.
 */
export function evaluate(input: EvaluateInput): EvaluationResult {
  const thresholds = input.ageThresholds ?? DEFAULT_AGE_THRESHOLDS;
  const isDone = input.status === 'done';
  const isInProgress = input.status === 'inProgress';
  // "Not done" only counts recognized non-done statuses; unknown statuses stay silent.
  const isNotDone = input.status === 'inProgress' || input.status === 'todo';

  return {
    start: evaluateStart(input, { isInProgress }, thresholds),
    end: evaluateEnd(input, { isDone, isInProgress, isNotDone }),
  };
}

function evaluateStart(
  input: EvaluateInput,
  flags: { isInProgress: boolean },
  thresholds: AgeThresholds,
): CellAlert | null {
  // 1. Missing Start: in progress but no start date.
  if (flags.isInProgress && !input.startDate) {
    return { type: 'missingStart', text: '⚠ Missing', level: 'caution' };
  }

  // 2. Age: in-progress work that started in the past. Age tracks long-running
  // *in progress* items (per the feature's goal), so Todo items are excluded
  // even though they are technically "not done".
  if (input.startDate && flags.isInProgress) {
    const age = diffInDays(input.today, input.startDate);
    if (age !== null && age >= 0) {
      return { type: 'age', text: `Age ${age}d`, level: ageLevel(age, thresholds) };
    }
  }

  return null;
}

function evaluateEnd(
  input: EvaluateInput,
  flags: { isDone: boolean; isInProgress: boolean; isNotDone: boolean },
): CellAlert | null {
  // 1. Overdue: not done and the end date is in the past.
  if (input.endDate && flags.isNotDone) {
    const overdue = diffInDays(input.today, input.endDate);
    if (overdue !== null && overdue > 0) {
      return { type: 'overdue', text: `Overdue ${overdue}d`, level: 'warning' };
    }
  }

  // 2. Missing End: done with no end date (data-quality warning), or in progress
  // with no target end date (can't tell if it's overdue without one). Todo items
  // are excluded — no end date is expected while work is still unplanned.
  if ((flags.isDone || flags.isInProgress) && !input.endDate) {
    return { type: 'missingEnd', text: '⚠ Missing', level: 'caution' };
  }

  return null;
}

function ageLevel(age: number, thresholds: AgeThresholds): AlertLevel {
  if (age >= thresholds.warning) return 'warning';
  if (age >= thresholds.caution) return 'caution';
  return 'normal';
}

/** Convenience wrapper: evaluate directly from resolved item data. */
export function evaluateItem(
  item: ItemFieldData,
  status: StatusCategory,
  today: string,
  ageThresholds?: AgeThresholds,
): EvaluationResult {
  return evaluate({
    startDate: item.startDate,
    endDate: item.endDate,
    status,
    today,
    ageThresholds,
  });
}
