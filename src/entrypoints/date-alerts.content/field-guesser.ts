// Date Field Alerts - Field Guesser
// Responsibility: guess Start/End field mapping from Date field names.
// Used to pre-select the config dropdowns; the user can always override.

import type { DateFieldOption } from './types';

const START_KEYWORDS = ['start', 'started', '開始', '着手'];
const END_KEYWORDS = ['end', 'completed', 'completion', 'complete', '終了', '完了'];

export interface GuessedMapping {
  startFieldId: string | null;
  endFieldId: string | null;
}

/**
 * Guess which field is Start and which is End by matching field names against
 * keyword lists. Picks the first matching field in the given order (callers
 * pass fields sorted by column position). A field is never used for both roles.
 */
export function guessMapping(fields: DateFieldOption[]): GuessedMapping {
  const start = fields.find((field) => nameMatches(field.name, START_KEYWORDS)) ?? null;
  const end = fields.find(
    (field) => field.id !== start?.id && nameMatches(field.name, END_KEYWORDS),
  ) ?? null;

  return {
    startFieldId: start?.id ?? null,
    endFieldId: end?.id ?? null,
  };
}

function nameMatches(name: string, keywords: string[]): boolean {
  const normalized = name.trim().toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}
