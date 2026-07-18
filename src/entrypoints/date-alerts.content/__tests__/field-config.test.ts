import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMapping,
  setMapping,
  isValidMapping,
  isMappingChange,
  DATE_FIELD_MAPPING_STORAGE_KEY,
} from '../field-config';

// Minimal in-memory mock of chrome.storage.local, matching the real async
// get(key)/set(obj) contract closely enough to exercise the read-modify-write
// logic in field-config.ts.
function installChromeStorageMock(): { data: Record<string, unknown> } {
  const state = { data: {} as Record<string, unknown> };
  (globalThis as { chrome?: unknown }).chrome = {
    storage: {
      local: {
        get: (key: string) =>
          Promise.resolve(key in state.data ? { [key]: state.data[key] } : {}),
        set: (items: Record<string, unknown>) => {
          Object.assign(state.data, items);
          return Promise.resolve();
        },
      },
    },
  };
  return state;
}

describe('field-config storage round-trip', () => {
  beforeEach(() => {
    installChromeStorageMock();
  });

  it('returns null when nothing has been saved for a project', async () => {
    expect(await getMapping('users:wozaki:4')).toBeNull();
  });

  it('saves and reads back a mapping with status ids', async () => {
    await setMapping('users:wozaki:4', {
      startFieldId: '1',
      endFieldId: '2',
      inProgressStatusIds: ['s2'],
      doneStatusIds: ['s4'],
    });
    expect(await getMapping('users:wozaki:4')).toEqual({
      startFieldId: '1',
      endFieldId: '2',
      inProgressStatusIds: ['s2'],
      doneStatusIds: ['s4'],
    });
  });

  it('overwrites a previously non-empty status mapping with an explicit empty one', async () => {
    await setMapping('users:wozaki:4', {
      startFieldId: '1',
      endFieldId: '2',
      inProgressStatusIds: ['s2'],
      doneStatusIds: ['s4'],
    });

    // Re-save with both pickers cleared — this is what the config panel sends
    // when the user deselects everything and clicks Save.
    await setMapping('users:wozaki:4', {
      startFieldId: '1',
      endFieldId: '2',
      inProgressStatusIds: [],
      doneStatusIds: [],
    });

    const saved = await getMapping('users:wozaki:4');
    expect(saved?.inProgressStatusIds).toEqual([]);
    expect(saved?.doneStatusIds).toEqual([]);
  });

  it('does not clobber another project sharing the same storage key', async () => {
    await setMapping('users:wozaki:4', { startFieldId: '1', endFieldId: '2', inProgressStatusIds: ['a'], doneStatusIds: [] });
    await setMapping('orgs:acme:9', { startFieldId: '3', endFieldId: '4', inProgressStatusIds: [], doneStatusIds: ['b'] });

    expect((await getMapping('users:wozaki:4'))?.inProgressStatusIds).toEqual(['a']);
    expect((await getMapping('orgs:acme:9'))?.doneStatusIds).toEqual(['b']);
  });

  it('defaults status ids to empty arrays when omitted from setMapping input', async () => {
    await setMapping('users:wozaki:4', { startFieldId: '1', endFieldId: '2' });
    const saved = await getMapping('users:wozaki:4');
    expect(saved?.inProgressStatusIds).toEqual([]);
    expect(saved?.doneStatusIds).toEqual([]);
  });
});

describe('isValidMapping', () => {
  it('is valid with just start/end ids, regardless of status ids', () => {
    expect(isValidMapping({ startFieldId: '1', endFieldId: '2', inProgressStatusIds: [], doneStatusIds: [] })).toBe(true);
    expect(isValidMapping({ startFieldId: '1', endFieldId: '2' })).toBe(true);
  });

  it('is invalid when start or end is missing/empty', () => {
    expect(isValidMapping(null)).toBe(false);
    expect(isValidMapping({ startFieldId: '', endFieldId: '2' })).toBe(false);
  });
});

describe('isMappingChange', () => {
  it('detects a change to the mapping storage key', () => {
    expect(isMappingChange({ [DATE_FIELD_MAPPING_STORAGE_KEY]: { oldValue: {}, newValue: {} } })).toBe(true);
  });

  it('ignores unrelated keys', () => {
    expect(isMappingChange({ 'some-other-key': { oldValue: {}, newValue: {} } })).toBe(false);
  });
});
