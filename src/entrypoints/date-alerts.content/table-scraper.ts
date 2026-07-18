// Date Field Alerts - Table Scraper
// Responsibility: locate the GitHub Projects list-view grid and map columns/rows
// to the DOM cells that annotations attach to. Uses role attributes (stable) and
// only substring class matches where unavoidable (GitHub hashes CSS class names).

import type { DateFieldOption } from './types';

/** The list-view grid element, or null when not present (e.g. board view). */
export function getGrid(doc: Document = document): HTMLElement | null {
  return doc.querySelector<HTMLElement>('[role="grid"]');
}

/** Clean field name shown in a column header (e.g. "Start on"). */
export function getColumnName(header: Element): string | null {
  const textEl = header.querySelector('[class*="table-header-cell-module__Text"]');
  if (textEl?.textContent) return textEl.textContent.trim();

  // Fallback: the tooltip reads "<name> column options"; strip the suffix.
  const tooltip = header.querySelector('[class*="Tooltip"]')?.textContent?.trim();
  if (tooltip) return tooltip.replace(/\s*column options$/i, '').trim() || null;
  return null;
}

/** Ordered list of visible column names in the grid. */
export function getVisibleColumnNames(grid: HTMLElement): string[] {
  return Array.from(grid.querySelectorAll('[role="columnheader"]'))
    .map((header) => getColumnName(header))
    .filter((name): name is string => !!name);
}

/**
 * Zero-based index of the column with the given name among visible columns,
 * or -1 when not visible. Matching is case-insensitive.
 */
export function getColumnIndex(grid: HTMLElement, fieldName: string): number {
  const target = fieldName.trim().toLowerCase();
  const names = getVisibleColumnNames(grid);
  return names.findIndex((name) => name.toLowerCase() === target);
}

/**
 * Keep only the fields that are currently visible as a column in the grid.
 *
 * A field can exist on the project (and so appear in the embedded field
 * metadata) without being added to this particular view's column list. Picking
 * such a field as Start/End would save successfully but never find a cell to
 * annotate, so candidates are restricted to what's actually on screen.
 */
export function filterFieldsVisibleAsColumns(
  grid: HTMLElement,
  fields: DateFieldOption[],
): DateFieldOption[] {
  const visible = new Set(getVisibleColumnNames(grid).map((name) => name.toLowerCase()));
  return fields.filter((field) => visible.has(field.name.trim().toLowerCase()));
}

/** Data rows (those with a Title rowheader), excluding the header row. */
export function getDataRows(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll<HTMLElement>('[role="row"]')).filter(
    (row) => row.querySelector('[role="rowheader"]') !== null,
  );
}

/** Issue/content id backing a row, parsed from its hovercard tag. Null for drafts. */
export function getRowContentId(row: HTMLElement): number | null {
  const tag = row.getAttribute('data-hovercard-subject-tag');
  const match = tag?.match(/issue:(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * The cell element for a given visible column index within a row.
 *
 * A row's column cells are: the Title `rowheader` (column 0) followed by the
 * `gridcell`s that come after it (columns 1..N). Any leading cells before the
 * rowheader (drag handle, selection checkbox) are ignored, so the returned index
 * lines up with `getColumnIndex`.
 */
export function getCellAt(row: HTMLElement, columnIndex: number): HTMLElement | null {
  if (columnIndex < 0) return null;
  const rowheader = row.querySelector<HTMLElement>('[role="rowheader"]');
  if (!rowheader) return null;
  if (columnIndex === 0) return rowheader;

  const orderedCells: HTMLElement[] = [rowheader];
  let sibling = rowheader.nextElementSibling;
  while (sibling) {
    if (sibling.getAttribute('role') === 'gridcell') {
      orderedCells.push(sibling as HTMLElement);
    }
    sibling = sibling.nextElementSibling;
  }
  return orderedCells[columnIndex] ?? null;
}
