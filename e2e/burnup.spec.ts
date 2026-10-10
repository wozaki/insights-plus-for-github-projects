import { test, expect } from './support/fixtures';
import { chart } from './support/project-page';
import { CHARTS, MIN_DAYS_UNTIL_CHART_END } from './support/project';

test('prediction chart range has not expired', async () => {
  const { configuration } = await chart(CHARTS.burnupPrediction);
  const endDate = configuration.time?.endDate;
  expect(configuration.time?.period, 'Period must be "Custom range"').toBe('custom');
  expect(endDate).toBeTruthy();

  const daysLeft = (Date.parse(`${endDate}T00:00:00Z`) - Date.now()) / 86_400_000;
  expect(
    daysLeft,
    `"${CHARTS.burnupPrediction}" ends on ${endDate}. Extend its custom range end date (see e2e/README.md).`,
  ).toBeGreaterThan(MIN_DAYS_UNTIL_CHART_END);
});

test('burnup chart shows the prediction panel and overlay', async ({ page }) => {
  await page.goto((await chart(CHARTS.burnupPrediction)).url);

  const panel = page.locator('.burnup-predictor-stats');
  await expect(panel).toBeVisible();
  await expect(page.locator('.burnup-config-warning')).toHaveCount(0);
  await expect(panel.locator('#burnup-prediction')).not.toContainText('Analyzing data...');
  await expect(panel.locator('#burnup-prediction')).not.toContainText('NaN');
  await expect(page.locator('#burnup-predictor-overlay')).toBeAttached();
});

test('burnup chart with a preset period shows the period warning', async ({ page }) => {
  await page.goto((await chart(CHARTS.burnupPeriodWarning)).url);

  await expect(page.locator('.burnup-config-warning')).toContainText('Period must be set to "Custom range"');
  await expect(page.locator('.burnup-predictor-stats')).toHaveCount(0);
});

test('burnup chart with a non-time x-axis shows the x-axis warning', async ({ page }) => {
  await page.goto((await chart(CHARTS.burnupXAxisWarning)).url);

  await expect(page.locator('.burnup-config-warning')).toContainText('X-axis must be set to "Time"');
  await expect(page.locator('.burnup-predictor-stats')).toHaveCount(0);
});
