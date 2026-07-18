import { describe, it, expect } from 'vitest';
import {
  parseColumns,
  parseNodes,
  getDateFields,
  getStatusOptions,
  extractItems,
  readMemexData,
} from '../memex-data';

// Shapes mirror the real GitHub Projects embedded JSON captured during the spike.
const COLUMNS = JSON.stringify([
  { id: 'Title', name: 'Title', dataType: 'title' },
  {
    id: 'Status',
    name: 'Status',
    dataType: 'singleSelect',
    settings: {
      options: [
        { id: 'f75ad846', name: 'Todo' },
        { id: '47fc9ee4', name: 'In Progress' },
        { id: '98236657', name: 'Done' },
      ],
    },
  },
  { id: 369979541, name: 'Start on', dataType: 'date' },
  { id: 369979609, name: 'End on', dataType: 'date' },
  { id: 256932131, name: 'Estimate', dataType: 'number' },
]);

const NODES = JSON.stringify({
  totalCount: { value: 2 },
  nodes: [
    {
      contentId: 3924644068,
      memexProjectColumnValues: [
        { memexProjectColumnId: 'Status', value: { id: '47fc9ee4' } },
        { memexProjectColumnId: 369979541, value: { value: '2026-07-17T00:00:00+00:00' } },
        { memexProjectColumnId: 369979609, value: { value: '2026-07-18T00:00:00+00:00' } },
      ],
    },
    {
      contentId: 3924661090,
      memexProjectColumnValues: [
        { memexProjectColumnId: 'Status', value: { id: '98236657' } },
        { memexProjectColumnId: 369979541, value: null },
        { memexProjectColumnId: 369979609, value: null },
      ],
    },
  ],
});

describe('parseColumns / getDateFields', () => {
  it('extracts only date-typed fields with stringified ids', () => {
    const fields = getDateFields(parseColumns(COLUMNS));
    expect(fields).toEqual([
      { id: '369979541', name: 'Start on' },
      { id: '369979609', name: 'End on' },
    ]);
  });
});

describe('getStatusOptions', () => {
  it('maps option ids to names', () => {
    const options = getStatusOptions(parseColumns(COLUMNS));
    expect(options.get('47fc9ee4')).toBe('In Progress');
    expect(options.get('98236657')).toBe('Done');
    expect(options.size).toBe(3);
  });
});

describe('parseNodes / extractItems', () => {
  it('resolves start/end dates and status names by contentId', () => {
    const options = getStatusOptions(parseColumns(COLUMNS));
    const items = extractItems(parseNodes(NODES), '369979541', '369979609', options);

    expect(items.get(3924644068)).toEqual({
      contentId: 3924644068,
      startDate: '2026-07-17',
      endDate: '2026-07-18',
      statusName: 'In Progress',
    });
    expect(items.get(3924661090)).toEqual({
      contentId: 3924661090,
      startDate: null,
      endDate: null,
      statusName: 'Done',
    });
  });

  it('returns null dates when field ids are unconfigured', () => {
    const options = getStatusOptions(parseColumns(COLUMNS));
    const items = extractItems(parseNodes(NODES), null, null, options);
    expect(items.get(3924644068)?.startDate).toBeNull();
    expect(items.get(3924644068)?.endDate).toBeNull();
    expect(items.get(3924644068)?.statusName).toBe('In Progress');
  });
});

describe('readMemexData', () => {
  function docWith(columns: string | null, items: string | null): Document {
    const doc = document.implementation.createHTMLDocument('test');
    if (columns !== null) {
      const s = doc.createElement('script');
      s.id = 'memex-columns-data';
      s.type = 'application/json';
      s.textContent = columns;
      doc.body.appendChild(s);
    }
    if (items !== null) {
      const s = doc.createElement('script');
      s.id = 'memex-paginated-items-data';
      s.type = 'application/json';
      s.textContent = items;
      doc.body.appendChild(s);
    }
    return doc;
  }

  it('reads fields and items from a document', () => {
    const data = readMemexData('369979541', '369979609', docWith(COLUMNS, NODES));
    expect(data).not.toBeNull();
    expect(data!.dateFields).toHaveLength(2);
    expect(data!.itemsByContentId.get(3924644068)?.startDate).toBe('2026-07-17');
  });

  it('returns null when the columns script is absent', () => {
    expect(readMemexData('1', '2', docWith(null, NODES))).toBeNull();
  });

  it('still returns field metadata when the items script is absent', () => {
    const data = readMemexData('369979541', '369979609', docWith(COLUMNS, null));
    expect(data).not.toBeNull();
    expect(data!.dateFields).toHaveLength(2);
    expect(data!.itemsByContentId.size).toBe(0);
  });

  it('tolerates malformed items JSON without throwing', () => {
    const data = readMemexData('369979541', '369979609', docWith(COLUMNS, '{ not json'));
    expect(data).not.toBeNull();
    expect(data!.itemsByContentId.size).toBe(0);
  });
});
