// Captures the parts of real GitHub pages that the extension reads, as
// fixtures for unit tests (fixtures/github-pages/). Runs without the extension
// so the snapshots contain only GitHub's own DOM.
//
// Run: pnpm fixtures:capture

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { chart, viewUrl } from '../support/project-page';
import { CHARTS, DATE_ALERTS_VIEW } from '../support/project';

const OUT_DIR = path.resolve(import.meta.dirname, '../../fixtures/github-pages');

function save(name: string, source: string, body: string): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const header = `<!-- Captured from ${source} on ${new Date().toISOString().slice(0, 10)} by e2e/capture/capture-fixtures.ts. Do not edit by hand. -->\n`;
  writeFileSync(path.join(OUT_DIR, name), header + body + '\n');
}

/** Insights page: the chart SVG plus the period picker the x-axis validator looks for. */
async function captureChart(page: Page, name: string, chartName: string): Promise<void> {
  const { url } = await chart(chartName);
  await page.goto(url);
  const svg = page.locator('svg.highcharts-root').first();
  await expect(svg).toBeVisible();
  // Wait until Highcharts' initial animation settles, so paths hold final values.
  let previous = '';
  await expect
    .poll(async () => {
      const current = await svg.evaluate((el) => el.outerHTML);
      const settled = current === previous;
      previous = current;
      return settled;
    }, { intervals: [500] })
    .toBe(true);

  const html = await page.evaluate(() => {
    const picker = document.querySelector('[class*="DatePickerContainer"]');
    const root = document.querySelector('svg.highcharts-root')?.cloneNode(true) as Element | undefined;
    if (!root) return null;
    // Path data is most of the file (one curve segment per day); sub-pixel
    // precision beyond 2 decimals doesn't affect the extracted values.
    root.querySelectorAll('path[d]').forEach((p) => {
      p.setAttribute('d', (p.getAttribute('d') ?? '').replace(/-?\d+\.\d{3,}/g, (n) => String(Number(Number(n).toFixed(2)))));
    });
    // The picker is absent for non-time x-axes, which the validator relies on.
    return [picker?.outerHTML ?? '', root.outerHTML].filter(Boolean).join('\n');
  });
  if (!html) throw new Error(`No Highcharts SVG on ${url}; has GitHub changed the page?`);
  // Highcharts generates random element ids per render, e.g. `highcharts-0aids7x-11-`;
  // pin them so a re-capture only shows real changes. The trailing `\d+-`
  // keeps class and variable names like `highcharts-neutral-color-10` intact.
  save(name, url, html.replace(/highcharts-[a-z0-9]{7}-(?=\d+-)/g, 'highcharts-fixture-'));
}

test('capture velocity chart', async ({ page }) => {
  await captureChart(page, 'insights-velocity.html', CHARTS.velocity);
});

test('capture burnup chart', async ({ page }) => {
  await captureChart(page, 'insights-burnup.html', CHARTS.burnupPrediction);
});

test('capture burnup chart with a non-time x-axis', async ({ page }) => {
  await captureChart(page, 'insights-burnup-iteration-axis.html', CHARTS.burnupXAxisWarning);
});

test('capture list view', async ({ page }) => {
  const url = await viewUrl(DATE_ALERTS_VIEW);
  await page.goto(url);
  await expect(page.locator('[role="grid"] [role="rowheader"]').first()).toBeVisible();

  // The embedded JSON the extension reads, and the table it annotates.
  const parts = await page.evaluate(() => {
    const json = ['memex-columns-data', 'memex-paginated-items-data'].map((id) => {
      const text = document.getElementById(id)?.textContent;
      return text ? `<script type="application/json" id="${id}">${text}</script>` : `missing #${id}`;
    });
    const table = document.querySelector('[role="grid"]')?.closest('[class*="table-module__tableRoot"]');
    const clone = table?.cloneNode(true);
    if (!(clone instanceof Element)) return [...json, 'missing table root'];
    clone.querySelectorAll('script, style').forEach((el) => el.remove());
    return [...json, clone.outerHTML];
  });
  const missing = parts.filter((part) => part.startsWith('missing '));
  if (missing.length > 0) throw new Error(`${missing.join(', ')} on ${url}; has GitHub changed the page?`);
  save('list-view.html', url, parts.join('\n'));
});
