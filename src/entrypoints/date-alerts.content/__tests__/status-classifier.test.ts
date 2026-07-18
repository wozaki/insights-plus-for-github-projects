import { describe, it, expect } from 'vitest';
import { classifyStatus } from '../status-classifier';

describe('classifyStatus', () => {
  it.each(['Done', 'done', 'Completed', 'Closed', '完了', 'クローズ'])('classifies "%s" as done', (name) => {
    expect(classifyStatus(name)).toBe('done');
  });

  it.each(['In Progress', 'In development', 'Doing', '開発中', '対応中', '作業中'])(
    'classifies "%s" as inProgress',
    (name) => {
      expect(classifyStatus(name)).toBe('inProgress');
    },
  );

  it.each(['Todo', 'To do', 'Backlog', '未着手', '予定'])('classifies "%s" as todo', (name) => {
    expect(classifyStatus(name)).toBe('todo');
  });

  it.each([null, undefined, '', '   ', 'On hold', 'Blocked'])('classifies "%s" as unknown', (name) => {
    expect(classifyStatus(name)).toBe('unknown');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(classifyStatus('  IN PROGRESS  ')).toBe('inProgress');
  });
});
