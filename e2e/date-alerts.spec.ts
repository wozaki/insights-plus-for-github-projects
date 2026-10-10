import { test, expect } from './support/fixtures';
import { viewUrl } from './support/project-page';
import { DATE_ALERTS_VIEW, DATE_ALERT_ITEMS, type ExpectedAlert } from './support/project';
import type { Locator, Page } from '@playwright/test';

const ALERT = '[data-insights-plus-date-alert]';

// Mirrors table-scraper.ts: column names come from the header text element,
// and a row's cells are its Title rowheader followed by the sibling gridcells.
async function columnIndex(page: Page, name: string): Promise<number> {
  const texts = await page
    .locator('[role="grid"] [role="columnheader"] [class*="table-header-cell-module__Text"]')
    .allInnerTexts();
  const index = texts.findIndex((t) => t.trim() === name);
  expect(index, `column "${name}" in view "${DATE_ALERTS_VIEW}"`).toBeGreaterThanOrEqual(0);
  return index;
}

async function expectAlert(cell: Locator, expected: ExpectedAlert | null): Promise<void> {
  const alert = cell.locator(ALERT);
  if (!expected) {
    await expect(alert).toHaveCount(0);
    return;
  }
  await expect(alert).toHaveText(expected.text);
  await expect(alert).toHaveClass(new RegExp(`iplus-date-alert--${expected.level}`));
}

test('date alerts annotate list view cells after configuring the date fields', async ({ page }) => {
  await page.goto(await viewUrl(DATE_ALERTS_VIEW));

  // A fresh browser profile has no saved mapping; save the guessed defaults.
  const config = page.locator('.iplus-date-config');
  await expect(config).toContainText('Date fields are not configured');
  await config.getByRole('button', { name: 'Configure' }).click();
  await expect(config.getByLabel('Start date field')).toHaveValue(/.+/);
  await expect(config.getByLabel('End date field')).toHaveValue(/.+/);
  await config.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator(ALERT).first()).toBeVisible();

  const startCol = await columnIndex(page, 'Start Date');
  const endCol = await columnIndex(page, 'End Date');

  for (const item of DATE_ALERT_ITEMS) {
    await test.step(item.title, async () => {
      const row = page.locator('[role="grid"] [role="row"]').filter({
        has: page.locator('[role="rowheader"]', { hasText: item.title }),
      });
      await expect(row).toHaveCount(1);
      const cells = row.locator('[role="rowheader"], [role="rowheader"] ~ [role="gridcell"]');
      await expectAlert(cells.nth(startCol), item.expected.start);
      await expectAlert(cells.nth(endCol), item.expected.end);
    });
  }
});
