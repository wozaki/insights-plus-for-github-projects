import { describe, it, expect } from 'vitest';
import { parseProjectUrl, isProjectPage, projectKey } from '../list-view-url';

describe('parseProjectUrl', () => {
  it('parses a user list view URL', () => {
    expect(parseProjectUrl('https://github.com/users/wozaki/projects/4/views/2')).toEqual({
      orgOrUser: 'users:wozaki',
      projectNumber: '4',
      viewNumber: '2',
    });
  });

  it('parses an org project URL without a view', () => {
    expect(parseProjectUrl('https://github.com/orgs/acme/projects/12')).toEqual({
      orgOrUser: 'orgs:acme',
      projectNumber: '12',
      viewNumber: null,
    });
  });

  it('ignores trailing query/hash', () => {
    expect(parseProjectUrl('https://github.com/users/wozaki/projects/4/views/2?filter=x#top')).toEqual({
      orgOrUser: 'users:wozaki',
      projectNumber: '4',
      viewNumber: '2',
    });
  });

  it('rejects non-github hosts', () => {
    expect(parseProjectUrl('https://example.com/users/wozaki/projects/4')).toBeNull();
  });

  it('rejects non-project pages', () => {
    expect(parseProjectUrl('https://github.com/wozaki/repo/issues/1')).toBeNull();
    expect(parseProjectUrl('https://github.com/users/wozaki/projects')).toBeNull();
  });

  it('rejects non-numeric project numbers', () => {
    expect(parseProjectUrl('https://github.com/users/wozaki/projects/abc')).toBeNull();
  });

  it('returns null viewNumber when views segment is malformed', () => {
    expect(parseProjectUrl('https://github.com/users/wozaki/projects/4/views/abc')?.viewNumber).toBeNull();
  });
});

describe('isProjectPage', () => {
  it('is true for a project view URL', () => {
    expect(isProjectPage('https://github.com/users/wozaki/projects/4/views/2')).toBe(true);
  });

  it('is false for an insights URL segment count but wrong host', () => {
    expect(isProjectPage('https://gitlab.com/users/x/projects/4')).toBe(false);
  });
});

describe('projectKey', () => {
  it('builds a stable per-project key', () => {
    expect(projectKey('https://github.com/users/wozaki/projects/4/views/2')).toBe('users:wozaki:4');
  });

  it('is the same across different views of the same project', () => {
    const a = projectKey('https://github.com/users/wozaki/projects/4/views/2');
    const b = projectKey('https://github.com/users/wozaki/projects/4/views/9');
    expect(a).toBe(b);
  });

  it('returns null for non-project pages', () => {
    expect(projectKey('https://github.com/wozaki')).toBeNull();
  });
});
