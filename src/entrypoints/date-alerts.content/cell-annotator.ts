// Date Field Alerts - Cell Annotator
// Responsibility: inject/update/remove a small annotation inside a date cell
// without replacing GitHub's own content. A single marked element per cell is
// reused (idempotent) so repeated re-render passes never duplicate annotations.
//
// Placement: GitHub renders a filled date inside a fixed-height, vertically
// centered flex container ("date-renderer-module__BaseCell"). We append the
// annotation *inside* that container so it sits inline next to the date and
// reads as belonging to it. Empty cells (Missing alerts) have no such container,
// so we fall back to the grid cell itself.

import type { CellAlert } from './types';

/** Attribute marking our injected element; value is the alert type. */
export const MARKER_ATTR = 'data-insights-plus-date-alert';
const BASE_CLASS = 'iplus-date-alert';
const DATE_CONTAINER_SELECTOR = '[class*="date-renderer-module__BaseCell"]';

/**
 * Apply (or clear) the annotation for a cell.
 * Passing `alert = null` removes any existing annotation.
 */
export function applyAlert(cell: HTMLElement, alert: CellAlert | null): void {
  const existing = cell.querySelector<HTMLElement>(`[${MARKER_ATTR}]`);

  if (!alert) {
    existing?.remove();
    return;
  }

  const target = cell.querySelector<HTMLElement>(DATE_CONTAINER_SELECTOR) ?? cell;

  let el = existing;
  // If the date container appeared/disappeared since last pass, re-home the node.
  if (el && el.parentElement !== target) {
    el.remove();
    el = null;
  }
  if (!el) {
    el = document.createElement('span');
    target.appendChild(el);
  }

  el.setAttribute(MARKER_ATTR, alert.type);
  el.className = `${BASE_CLASS} ${BASE_CLASS}--${alert.level}`;
  el.textContent = alert.text;
}

/** Remove every annotation this feature added, anywhere in the document. */
export function removeAllAnnotations(root: ParentNode = document): void {
  root.querySelectorAll(`[${MARKER_ATTR}]`).forEach((el) => el.remove());
}
