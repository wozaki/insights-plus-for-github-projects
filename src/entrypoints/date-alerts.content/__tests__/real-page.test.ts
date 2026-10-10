// Contract tests against a real GitHub list view, captured by
// `pnpm fixtures:capture` from the e2e fixture project (see e2e/README.md).
// When GitHub changes its markup, re-capture and fix the readers here.

import { describe, it, expect, beforeEach } from 'vitest';
import listViewHtml from '../../../../fixtures/github-pages/list-view.html?raw';
import { readMemexData } from '../memex-data';
import {
  getGrid,
  getTableRoot,
  getVisibleColumnNames,
  getColumnIndex,
  getDataRows,
  getRowContentId,
  getCellAt,
} from '../table-scraper';
import { guessMapping } from '../field-guesser';
import { resolveStatusCategory } from '../status-classifier';
import { evaluateItem } from '../alert-evaluator';
import { applyAlert } from '../cell-annotator';

// Fixture issues have fixed dates (e2e/README.md), so a fixed "today" gives
// exact alert text.
const TODAY = '2026-10-10';

const EXPECTED: Record<string, { start: string | null; end: string | null }> = {
  '[e2e] In progress, age warning': { start: 'Age 282d', end: null },
  '[e2e] In progress, age warning and overdue': { start: 'Age 282d', end: 'Overdue 251d' },
  '[e2e] In progress, missing dates': { start: '⚠ Missing', end: '⚠ Missing' },
  '[e2e] In progress, missing start': { start: '⚠ Missing', end: null },
  '[e2e] In review, age warning': { start: 'Age 282d', end: null },
  '[e2e] Todo, no alerts': { start: null, end: null },
  // Unlike the e2e test, no status mapping is saved here, so keyword matching
  // classifies Todo as todo and an overdue Todo item is flagged.
  '[e2e] Todo past end date, no alerts': { start: null, end: 'Overdue 251d' },
  '[e2e] Done, no alerts': { start: null, end: null },
  '[e2e] Done, missing end': { start: null, end: '⚠ Missing' },
};

function rowTitle(row: HTMLElement): string {
  return row.querySelector('[role="rowheader"] a')?.textContent?.trim() ?? '';
}

describe('date alerts on a real list view', () => {
  beforeEach(() => {
    document.body.innerHTML = listViewHtml;
  });

  it('finds the list table and its columns', () => {
    const grid = getGrid(document);
    expect(grid).not.toBeNull();
    expect(getTableRoot(grid!)).not.toBeNull();
    expect(getVisibleColumnNames(grid!)).toEqual(expect.arrayContaining(['Title', 'Status', 'Start Date', 'End Date']));
  });

  it('reads date fields and status options from the embedded JSON', () => {
    const data = readMemexData(null, null, document);
    expect(data).not.toBeNull();
    expect(data!.dateFields.map((f) => f.name)).toEqual(expect.arrayContaining(['Start Date', 'End Date']));
    expect(data!.statusOptionList.map((o) => o.name)).toEqual(['Todo', 'In Progress', 'Review', 'Done']);
  });

  it('guesses Start Date / End Date as the mapping', () => {
    const data = readMemexData(null, null, document)!;
    const guessed = guessMapping(data.dateFields);
    const nameOf = (id: string | null) => data.dateFields.find((f) => f.id === id)?.name;
    expect(nameOf(guessed.startFieldId)).toBe('Start Date');
    expect(nameOf(guessed.endFieldId)).toBe('End Date');
  });

  it('matches every table row to an item by content id', () => {
    const data = readMemexData(null, null, document)!;
    const rows = getDataRows(getGrid(document)!);
    expect(rows).toHaveLength(Object.keys(EXPECTED).length);
    for (const row of rows) {
      const contentId = getRowContentId(row);
      expect(contentId, rowTitle(row)).not.toBeNull();
      expect(data.itemsByContentId.has(contentId!), rowTitle(row)).toBe(true);
    }
  });

  it('annotates each date cell with the expected alert', () => {
    const grid = getGrid(document)!;
    const fields = readMemexData(null, null, document)!.dateFields;
    const { startFieldId, endFieldId } = guessMapping(fields);
    const data = readMemexData(startFieldId, endFieldId, document)!;
    const startCol = getColumnIndex(grid, 'Start Date');
    const endCol = getColumnIndex(grid, 'End Date');

    for (const row of getDataRows(grid)) {
      const title = rowTitle(row);
      const item = data.itemsByContentId.get(getRowContentId(row)!)!;
      const result = evaluateItem(item, resolveStatusCategory(item.statusId, item.statusName, null), TODAY);
      const startCell = getCellAt(row, startCol)!;
      const endCell = getCellAt(row, endCol)!;
      applyAlert(startCell, result.start);
      applyAlert(endCell, result.end);

      const textIn = (cell: HTMLElement) =>
        cell.querySelector('[data-insights-plus-date-alert]')?.textContent ?? null;
      expect({ start: textIn(startCell), end: textIn(endCell) }, title).toEqual(EXPECTED[title]);
    }
  });

  it('places annotations next to a filled date, inside GitHub\'s date container', () => {
    const grid = getGrid(document)!;
    const startCol = getColumnIndex(grid, 'Start Date');
    const row = getDataRows(grid).find((r) => rowTitle(r) === '[e2e] In progress, age warning')!;
    const cell = getCellAt(row, startCol)!;
    applyAlert(cell, { type: 'age', text: 'Age 282d', level: 'warning' });

    const alert = cell.querySelector('[data-insights-plus-date-alert]')!;
    expect(alert.parentElement?.className).toMatch(/date-renderer-module__BaseCell/);
  });
});
