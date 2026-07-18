// Date Field Alerts - Status Classifier
// Responsibility: map a raw Status option name to a normalized category.
// Keyword based and case-insensitive; unrecognized names return 'unknown'
// so that status-dependent alerts stay silent rather than guess.

import type { StatusCategory } from './types';

const DONE_KEYWORDS = ['done', 'closed', 'complete', 'completed', 'shipped', 'resolved', '完了', '済', 'クローズ'];
const IN_PROGRESS_KEYWORDS = ['in progress', 'in development', 'doing', 'progress', 'wip', '開発中', '対応中', '進行', '作業中'];
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
