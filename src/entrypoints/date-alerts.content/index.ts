// Date Field Alerts - Content Script (List View)
// Adds Start/End date alerts inside GitHub Projects list-view cells.
//
// Runs on any project page (the existing scripts only cover /insights), then
// gates on the presence of the list-view grid + embedded memex data at runtime.

import { defineContentScript } from 'wxt/utils/define-content-script';
import { PROJECT_URL_PATTERNS, isProjectPage, projectKey } from './list-view-url';
import { readMemexData } from './memex-data';
import { getMapping, setMapping, isMappingChange, isValidMapping } from './field-config';
import { guessMapping } from './field-guesser';
import { classifyStatus } from './status-classifier';
import { evaluateItem } from './alert-evaluator';
import { todayDateOnly } from './date-utils';
import { createConfigView, CONFIG_VIEW_CLASS } from './config-view';
import { applyAlert, removeAllAnnotations } from './cell-annotator';
import {
  getGrid,
  getDataRows,
  getRowContentId,
  getColumnIndex,
  getCellAt,
  filterFieldsVisibleAsColumns,
} from './table-scraper';
import type { DateFieldMapping, DateFieldOption } from './types';
import './style.css';

const LOG_PREFIX = '[Date Field Alerts]';
const GRID_POLL_INTERVAL_MS = 500;
const GRID_POLL_MAX_ATTEMPTS = 30;
const ANNOTATE_DEBOUNCE_MS = 150;

export default defineContentScript({
  matches: PROJECT_URL_PATTERNS,
  runAt: 'document_idle',

  main() {
    let gridObserver: MutationObserver | null = null;
    let annotateTimer: ReturnType<typeof setTimeout> | null = null;
    let initToken = 0;

    function teardown(): void {
      gridObserver?.disconnect();
      gridObserver = null;
      if (annotateTimer) {
        clearTimeout(annotateTimer);
        annotateTimer = null;
      }
      document.querySelector(`.${CONFIG_VIEW_CLASS}`)?.remove();
      removeAllAnnotations();
    }

    async function initialize(): Promise<void> {
      const token = ++initToken;
      teardown();

      if (!isProjectPage()) return;

      const grid = await waitForGrid(() => token === initToken);
      if (!grid || token !== initToken) return;

      const key = projectKey();
      if (!key) return;

      const mapping = await getMapping(key);
      // Read field metadata first (needed by the config view even when unmapped).
      const metaOnly = readMemexData(null, null);
      if (!metaOnly) {
        console.warn(`${LOG_PREFIX} No memex data found; skipping.`);
        return;
      }
      if (token !== initToken) return;

      // Only offer fields that are actually columns in this view — a field can
      // exist on the project without being added here, and picking one would
      // save but never find a cell to annotate.
      const dateFields = filterFieldsVisibleAsColumns(grid, metaOnly.dateFields);
      mountConfigView(grid, key, dateFields, mapping);

      if (isValidMapping(mapping)) {
        renderAlerts(grid, mapping);
        observeGrid(grid, mapping, () => token === initToken);
      } else {
        removeAllAnnotations();
      }
    }

    function mountConfigView(
      grid: HTMLElement,
      key: string,
      dateFields: DateFieldOption[],
      mapping: DateFieldMapping | null,
    ): void {
      const view = createConfigView({
        dateFields,
        currentMapping: mapping,
        guessedMapping: guessMapping(dateFields),
        onSave: (next) => setMapping(key, next),
      });

      const anchor = grid.closest('[class*="table-module__tableRoot"]') ?? grid;
      anchor.parentElement?.insertBefore(view, anchor);
    }

    function renderAlerts(grid: HTMLElement, mapping: DateFieldMapping): void {
      // Re-read item values (fresh columns/items snapshot) and column positions.
      const data = readMemexData(mapping.startFieldId, mapping.endFieldId);
      if (!data) return;

      const startName = data.dateFields.find((f) => f.id === mapping.startFieldId)?.name;
      const endName = data.dateFields.find((f) => f.id === mapping.endFieldId)?.name;
      const startCol = startName ? getColumnIndex(grid, startName) : -1;
      const endCol = endName ? getColumnIndex(grid, endName) : -1;
      const today = todayDateOnly();

      for (const row of getDataRows(grid)) {
        const contentId = getRowContentId(row);
        const item = contentId != null ? data.itemsByContentId.get(contentId) : undefined;
        const result = item
          ? evaluateItem(item, classifyStatus(item.statusName), today)
          : { start: null, end: null };

        if (startCol >= 0) {
          const cell = getCellAt(row, startCol);
          if (cell) applyAlert(cell, result.start);
        }
        if (endCol >= 0) {
          const cell = getCellAt(row, endCol);
          if (cell) applyAlert(cell, result.end);
        }
      }
    }

    function observeGrid(grid: HTMLElement, mapping: DateFieldMapping, isCurrent: () => boolean): void {
      gridObserver = new MutationObserver(() => {
        if (annotateTimer) clearTimeout(annotateTimer);
        annotateTimer = setTimeout(() => {
          annotateTimer = null;
          if (!isCurrent()) return;
          // Detach while we mutate so our own annotations don't retrigger us.
          gridObserver?.disconnect();
          renderAlerts(grid, mapping);
          gridObserver?.observe(grid, { childList: true, subtree: true });
        }, ANNOTATE_DEBOUNCE_MS);
      });
      gridObserver.observe(grid, { childList: true, subtree: true });
    }

    async function waitForGrid(isCurrent: () => boolean): Promise<HTMLElement | null> {
      for (let attempt = 0; attempt < GRID_POLL_MAX_ATTEMPTS; attempt++) {
        if (!isCurrent()) return null;
        const grid = getGrid();
        if (grid) return grid;
        await delay(GRID_POLL_INTERVAL_MS);
      }
      return null;
    }

    // --- Boot & lifecycle ---

    function boot(): void {
      void initialize();
    }

    if (document.readyState === 'complete') {
      setTimeout(boot, 500);
    } else {
      window.addEventListener('load', () => setTimeout(boot, 500));
    }

    // SPA navigation: GitHub Projects is a single-page app.
    let lastUrl = window.location.href;
    new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        teardown();
        setTimeout(boot, 500);
      }
    }).observe(document.body, { childList: true, subtree: true });

    // Re-render when the mapping is changed from the config view (or another tab).
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && isMappingChange(changes)) {
        boot();
      }
    });
  },
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
