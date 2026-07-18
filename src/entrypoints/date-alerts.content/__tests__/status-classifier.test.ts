import { describe, it, expect } from 'vitest';
import { classifyStatus, resolveStatusCategory } from '../status-classifier';
import type { StatusMapping } from '../types';

describe('classifyStatus', () => {
  it.each(['Done', 'done', 'Completed', 'Closed', '完了', 'クローズ'])('classifies "%s" as done', (name) => {
    expect(classifyStatus(name)).toBe('done');
  });

  it.each([
    'In Progress', 'In development', 'Doing', '開発中', '対応中', '作業中',
    'In Review', 'Review', 'Reviewing', 'Code Review', 'レビュー中',
  ])('classifies "%s" as inProgress', (name) => {
    expect(classifyStatus(name)).toBe('inProgress');
  });

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

describe('resolveStatusCategory', () => {
  const emptyMapping: StatusMapping = { inProgressStatusIds: [], doneStatusIds: [] };
  const mapping: StatusMapping = { inProgressStatusIds: ['s2', 's3'], doneStatusIds: ['s4'] };

  it('falls back to keyword matching when no mapping is configured', () => {
    expect(resolveStatusCategory('s2', 'In Progress', emptyMapping)).toBe('inProgress');
    expect(resolveStatusCategory('s2', 'In Progress', null)).toBe('inProgress');
  });

  it('falls back to keyword matching for an unrecognized name when unmapped', () => {
    // "Staging" doesn't match any keyword, so it stays unknown without a mapping.
    expect(resolveStatusCategory('s9', 'Staging', emptyMapping)).toBe('unknown');
  });

  it('uses the explicit mapping over the keyword guess once one is configured', () => {
    // "Blocked" wouldn't keyword-match inProgress, but is explicitly mapped here.
    expect(resolveStatusCategory('s3', 'Blocked', mapping)).toBe('inProgress');
    expect(resolveStatusCategory('s4', 'Shipped 🚀', mapping)).toBe('done');
  });

  it('treats an option left out of both lists as todo once a mapping exists, ignoring keywords', () => {
    // "Done" would keyword-match, but explicit mapping mode doesn't fall back.
    expect(resolveStatusCategory('s5', 'Done', mapping)).toBe('todo');
  });

  it('treats a null option id as todo when a mapping is configured', () => {
    expect(resolveStatusCategory(null, null, mapping)).toBe('todo');
  });

  it('done takes priority when an id is (incorrectly) present in both lists', () => {
    const conflicting: StatusMapping = { inProgressStatusIds: ['s1'], doneStatusIds: ['s1'] };
    expect(resolveStatusCategory('s1', 'Weird', conflicting)).toBe('done');
  });
});
