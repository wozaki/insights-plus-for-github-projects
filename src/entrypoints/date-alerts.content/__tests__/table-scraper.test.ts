import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGrid,
  getColumnName,
  getVisibleColumnNames,
  getColumnIndex,
  getDataRows,
  getRowContentId,
  getCellAt,
  filterFieldsVisibleAsColumns,
} from '../table-scraper';

const COLUMNS = ['Title', 'Status', 'Iteration', 'Milestone', 'Start on', 'End on'];

// Builds a grid that mirrors GitHub's real structure: a header row of
// columnheaders, and data rows shaped [dragger gridcell, rowheader(Title),
// gridcell per remaining column].
function buildGrid(rows: Array<{ contentId?: number; values: string[] }>): HTMLElement {
  const grid = document.createElement('div');
  grid.setAttribute('role', 'grid');

  const headerRow = document.createElement('div');
  headerRow.setAttribute('role', 'row');
  for (const name of COLUMNS) {
    const header = document.createElement('div');
    header.setAttribute('role', 'columnheader');
    const text = document.createElement('span');
    text.className = 'table-header-cell-module__Text__ABCDE';
    text.textContent = name;
    const tooltip = document.createElement('span');
    tooltip.className = 'prc-TooltipV2-Tooltip-xyz';
    tooltip.textContent = `${name} column options`;
    header.append(text, tooltip);
    headerRow.appendChild(header);
  }
  grid.appendChild(headerRow);

  for (const row of rows) {
    const tr = document.createElement('div');
    tr.setAttribute('role', 'row');
    if (row.contentId) tr.setAttribute('data-hovercard-subject-tag', `issue:${row.contentId}`);

    const dragger = document.createElement('div');
    dragger.setAttribute('role', 'gridcell');
    tr.appendChild(dragger);

    const title = document.createElement('div');
    title.setAttribute('role', 'rowheader');
    title.textContent = row.values[0];
    tr.appendChild(title);

    for (let i = 1; i < COLUMNS.length; i++) {
      const cell = document.createElement('div');
      cell.setAttribute('role', 'gridcell');
      cell.textContent = row.values[i] ?? '';
      tr.appendChild(cell);
    }
    grid.appendChild(tr);
  }

  document.body.appendChild(grid);
  return grid;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('getGrid', () => {
  it('finds the grid element', () => {
    buildGrid([]);
    expect(getGrid()).not.toBeNull();
  });

  it('returns null when absent', () => {
    expect(getGrid()).toBeNull();
  });
});

describe('getColumnName / getVisibleColumnNames', () => {
  it('extracts the clean name from a header', () => {
    const grid = buildGrid([]);
    const header = grid.querySelector('[role="columnheader"]')!;
    expect(getColumnName(header)).toBe('Title');
  });

  it('lists visible columns in order', () => {
    const grid = buildGrid([]);
    expect(getVisibleColumnNames(grid)).toEqual(COLUMNS);
  });
});

describe('getColumnIndex', () => {
  it('finds a column index case-insensitively', () => {
    const grid = buildGrid([]);
    expect(getColumnIndex(grid, 'Start on')).toBe(4);
    expect(getColumnIndex(grid, 'end on')).toBe(5);
  });

  it('returns -1 for a hidden/missing column', () => {
    const grid = buildGrid([]);
    expect(getColumnIndex(grid, 'TestTime')).toBe(-1);
  });
});

describe('filterFieldsVisibleAsColumns', () => {
  it('keeps only fields that are currently visible as a column', () => {
    const grid = buildGrid([]);
    const fields = [
      { id: '1', name: 'Start on' },
      { id: '2', name: 'End on' },
      { id: '3', name: 'Due date' }, // exists on the project, but not added to this view
    ];
    expect(filterFieldsVisibleAsColumns(grid, fields)).toEqual([
      { id: '1', name: 'Start on' },
      { id: '2', name: 'End on' },
    ]);
  });

  it('matches case-insensitively', () => {
    const grid = buildGrid([]);
    expect(filterFieldsVisibleAsColumns(grid, [{ id: '1', name: 'START ON' }])).toEqual([
      { id: '1', name: 'START ON' },
    ]);
  });

  it('returns an empty array when no fields are visible', () => {
    const grid = buildGrid([]);
    expect(filterFieldsVisibleAsColumns(grid, [{ id: '1', name: 'Due date' }])).toEqual([]);
  });
});

describe('getDataRows / getRowContentId', () => {
  it('returns only data rows and their content ids', () => {
    const grid = buildGrid([
      { contentId: 111, values: ['A', 'Done', '', '', '', ''] },
      { contentId: 222, values: ['B', 'Todo', '', '', '', ''] },
    ]);
    const rows = getDataRows(grid);
    expect(rows).toHaveLength(2);
    expect(getRowContentId(rows[0])).toBe(111);
    expect(getRowContentId(rows[1])).toBe(222);
  });

  it('returns null content id for a draft row without a hovercard tag', () => {
    const grid = buildGrid([{ values: ['Draft', 'Todo', '', '', '', ''] }]);
    expect(getRowContentId(getDataRows(grid)[0])).toBeNull();
  });
});

describe('getCellAt', () => {
  it('maps column index to the correct cell, aligned with getColumnIndex', () => {
    const grid = buildGrid([{ contentId: 1, values: ['Title!', 'In Progress', 'Iter 1', 'M1', 'S-DATE', 'E-DATE'] }]);
    const row = getDataRows(grid)[0];

    expect(getCellAt(row, 0)?.getAttribute('role')).toBe('rowheader'); // Title
    expect(getCellAt(row, getColumnIndex(grid, 'Status'))?.textContent).toBe('In Progress');
    expect(getCellAt(row, getColumnIndex(grid, 'Start on'))?.textContent).toBe('S-DATE');
    expect(getCellAt(row, getColumnIndex(grid, 'End on'))?.textContent).toBe('E-DATE');
  });

  it('returns null for out-of-range or negative indices', () => {
    const grid = buildGrid([{ contentId: 1, values: ['T', 's', '', '', '', ''] }]);
    const row = getDataRows(grid)[0];
    expect(getCellAt(row, -1)).toBeNull();
    expect(getCellAt(row, 99)).toBeNull();
  });
});
