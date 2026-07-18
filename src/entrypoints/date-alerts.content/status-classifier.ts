// Date Field Alerts - Status Classifier
// Responsibility: map a raw Status option name to a normalized category.
// Keyword based and case-insensitive; unrecognized names return 'unknown'
// so that status-dependent alerts stay silent rather than guess.

import type { StatusCategory, StatusMapping } from './types';

const DONE_KEYWORDS = ['done', 'closed', 'complete', 'completed', 'shipped', 'resolved', '完了', '済', 'クローズ'];
// Review-ish statuses (work has started and isn't merged/closed yet) count as
// in progress, since Age/Overdue tracking cares about "started, not done" either way.
const IN_PROGRESS_KEYWORDS = [
  'in progress', 'in development', 'doing', 'progress', 'wip', '開発中', '対応中', '進行', '作業中',
  'review', 'reviewing', 'in review', 'code review', 'レビュー',
];
const TODO_KEYWORDS = ['todo', 'to do', 'backlog', 'planned', 'ready', '未着手', '未対応', '未開始', '予定'];

/**
 * Classify a Status field name into 'todo' | 'inProgress' | 'done' | 'unknown'.
 * Order matters: 'done' and 'inProgress' are checked before 'todo' because some
 * names could loosely match multiple lists.
 */
export function classifyStatus(name: string | null | undefined): StatusCategory {
  if (!name) return 'unknown';
  const normalized = name.trim().toLowerCase();
  if (!normalized) return 'unknown';

  if (matches(normalized, DONE_KEYWORDS)) return 'done';
  if (matches(normalized, IN_PROGRESS_KEYWORDS)) return 'inProgress';
  if (matches(normalized, TODO_KEYWORDS)) return 'todo';
  return 'unknown';
}

function matches(normalized: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalized.includes(keyword));
}

/**
 * Resolve a Status option to a category, preferring an explicit per-project
 * mapping (by option id) when the project has configured one.
 *
 * With ~10 Status options being common, requiring every option to be
 * classified is real setup cost, so the mapping is opt-in: a project that has
 * never touched the pickers (both fields `undefined`) falls back to keyword
 * matching on the option name, preserving today's zero-config default.
 *
 * But once the pickers have been saved at all — even saved with nothing
 * selected via the Clear button — the mapping takes full control: an option
 * not found in either list resolves to 'unknown' (no alerts), rather than
 * silently falling back to a keyword guess. Saving "nothing selected" is a
 * deliberate "don't classify by status" choice, not the same as never having
 * configured it, so it must not quietly re-enable keyword matching.
 */
export function resolveStatusCategory(
  optionId: string | null,
  optionName: string | null,
  mapping: StatusMapping | null,
): StatusCategory {
  const isConfigured = mapping !== null && (mapping.inProgressStatusIds !== undefined || mapping.doneStatusIds !== undefined);

  if (isConfigured && mapping !== null) {
    if (optionId && mapping.doneStatusIds?.includes(optionId)) return 'done';
    if (optionId && mapping.inProgressStatusIds?.includes(optionId)) return 'inProgress';
    return 'unknown';
  }

  return classifyStatus(optionName);
}
