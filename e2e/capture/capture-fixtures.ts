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
  // Let Highcharts finish its initial animation so paths hold final values.
  await page.waitForTimeout(2_000);

  const html = await page.evaluate(() => {
    const picker = document.querySelector('[class*="DatePickerContainer"]');
    const root = document.querySelector('svg.highcharts-root')?.cloneNode(true) as Element | undefined;
    // Path data is most of the file (one curve segment per day); sub-pixel
    // precision beyond 2 decimals doesn't affect the extracted values.
    root?.querySelectorAll('path[d]').forEach((p) => {
      p.setAttribute('d', (p.getAttribute('d') ?? '').replace(/-?\d+\.\d{3,}/g, (n) => String(Number(Number(n).toFixed(2)))));
    });
    return [picker?.outerHTML ?? '', root?.outerHTML ?? ''].filter(Boolean).join('\n');
  });
  // Highcharts generates random element ids per render; pin them so a
  // re-capture only shows real changes.
  save(name, url, html.replace(/highcharts-[a-z0-9]{7}-/g, 'highcharts-fixture-'));
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
  const html = await page.evaluate(() => {
    const scripts = ['memex-columns-data', 'memex-paginated-items-data'].map((id) => {
      const el = document.getElementById(id);
      return el ? `<script type="application/json" id="${id}">${el.textContent}</script>` : '';
    });
    const table = document.querySelector('[role="grid"]')?.closest('[class*="table-module__tableRoot"]');
    const clone = table?.cloneNode(true) as Element | undefined;
    clone?.querySelectorAll('script, style').forEach((el) => el.remove());
    return [...scripts, clone?.outerHTML ?? ''].join('\n');
  });
  save('list-view.html', url, html);
});
