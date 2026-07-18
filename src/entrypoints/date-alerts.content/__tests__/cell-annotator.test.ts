import { describe, it, expect, beforeEach } from 'vitest';
import { applyAlert, removeAllAnnotations, MARKER_ATTR } from '../cell-annotator';
import type { CellAlert } from '../types';

const ageAlert: CellAlert = { type: 'age', text: 'Age 8d', level: 'caution' };
const overdueAlert: CellAlert = { type: 'overdue', text: 'Overdue 3d', level: 'warning' };

// An empty cell (no date) — as GitHub renders it when the field is unset.
function makeCell(): HTMLElement {
  const cell = document.createElement('div');
  cell.setAttribute('role', 'gridcell');
  const existing = document.createElement('span');
  existing.textContent = 'Jul 1'; // GitHub's own date content
  cell.appendChild(existing);
  document.body.appendChild(cell);
  return cell;
}

// A filled date cell — date sits inside GitHub's date-renderer flex container.
function makeDateCell(): { cell: HTMLElement; container: HTMLElement } {
  const cell = document.createElement('div');
  cell.setAttribute('role', 'gridcell');
  const container = document.createElement('div');
  container.className = 'date-renderer-module__BaseCell__lSqQP base-cell-module__Box';
  const date = document.createElement('span');
  date.textContent = 'Jul 19, 2026';
  container.appendChild(date);
  cell.appendChild(container);
  document.body.appendChild(cell);
  return { cell, container };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('applyAlert', () => {
  it('appends an annotation without removing existing cell content', () => {
    const cell = makeCell();
    applyAlert(cell, ageAlert);

    const el = cell.querySelector(`[${MARKER_ATTR}]`)!;
    expect(el.textContent).toBe('Age 8d');
    expect(el.getAttribute(MARKER_ATTR)).toBe('age');
    expect(el.className).toContain('iplus-date-alert--caution');
    expect(cell.textContent).toContain('Jul 1'); // original preserved
  });

  it('is idempotent: repeated calls do not duplicate the annotation', () => {
    const cell = makeCell();
    applyAlert(cell, ageAlert);
    applyAlert(cell, ageAlert);
    expect(cell.querySelectorAll(`[${MARKER_ATTR}]`)).toHaveLength(1);
  });

  it('updates in place when the alert changes', () => {
    const cell = makeCell();
    applyAlert(cell, ageAlert);
    applyAlert(cell, overdueAlert);

    const els = cell.querySelectorAll(`[${MARKER_ATTR}]`);
    expect(els).toHaveLength(1);
    expect(els[0].textContent).toBe('Overdue 3d');
    expect(els[0].getAttribute(MARKER_ATTR)).toBe('overdue');
    expect(els[0].className).toContain('iplus-date-alert--warning');
  });

  it('removes the annotation when passed null', () => {
    const cell = makeCell();
    applyAlert(cell, ageAlert);
    applyAlert(cell, null);
    expect(cell.querySelector(`[${MARKER_ATTR}]`)).toBeNull();
    expect(cell.textContent).toContain('Jul 1');
  });

  it('places the annotation inside the date container for a filled cell', () => {
    const { cell, container } = makeDateCell();
    applyAlert(cell, ageAlert);

    const el = container.querySelector(`[${MARKER_ATTR}]`);
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('Age 8d');
    expect(cell.querySelectorAll(`[${MARKER_ATTR}]`)).toHaveLength(1);
  });

  it('re-homes the annotation when a cell gains a date container', () => {
    const cell = makeCell();
    applyAlert(cell, ageAlert); // empty cell -> attaches to the cell itself

    // Cell later renders a date container (e.g. user filled the date in).
    const container = document.createElement('div');
    container.className = 'date-renderer-module__BaseCell__x';
    container.appendChild(document.createTextNode('Jul 19, 2026'));
    cell.appendChild(container);

    applyAlert(cell, ageAlert);
    expect(cell.querySelectorAll(`[${MARKER_ATTR}]`)).toHaveLength(1);
    expect(container.querySelector(`[${MARKER_ATTR}]`)).not.toBeNull();
  });
});

describe('removeAllAnnotations', () => {
  it('clears every annotation under the root', () => {
    const a = makeCell();
    const b = makeCell();
    applyAlert(a, ageAlert);
    applyAlert(b, overdueAlert);
    removeAllAnnotations(document);
    expect(document.querySelectorAll(`[${MARKER_ATTR}]`)).toHaveLength(0);
  });
});
