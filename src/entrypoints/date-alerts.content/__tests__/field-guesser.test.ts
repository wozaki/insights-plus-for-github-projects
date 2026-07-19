import { describe, it, expect } from 'vitest';
import { guessMapping } from '../field-guesser';
import type { DateFieldOption } from '../types';

const fields = (...names: Array<[string, string]>): DateFieldOption[] =>
  names.map(([id, name]) => ({ id, name }));

describe('guessMapping', () => {
  it('guesses Start and End from English names', () => {
    const result = guessMapping(fields(['1', 'Start on'], ['2', 'End on']));
    expect(result).toEqual({ startFieldId: '1', endFieldId: '2' });
  });

  it('guesses from Japanese names', () => {
    const result = guessMapping(fields(['a', '着手日'], ['b', '完了日']));
    expect(result).toEqual({ startFieldId: 'a', endFieldId: 'b' });
  });

  it('does not assign the same field to both roles', () => {
    // "Completion start" matches both lists; it should win Start (first found)
    // and End must fall back to a different field.
    const result = guessMapping(fields(['1', 'Completion start'], ['2', 'End date']));
    expect(result.startFieldId).toBe('1');
    expect(result.endFieldId).toBe('2');
  });

  it('returns nulls when nothing matches', () => {
    const result = guessMapping(fields(['1', 'Review by'], ['2', 'Target']));
    expect(result).toEqual({ startFieldId: null, endFieldId: null });
  });

  it('picks the first matching field by given order', () => {
    const result = guessMapping(fields(['1', 'Dev start'], ['2', 'Started at']));
    expect(result.startFieldId).toBe('1');
  });

  it('handles an empty field list', () => {
    expect(guessMapping([])).toEqual({ startFieldId: null, endFieldId: null });
  });
});
