import { test, expect } from './support/fixtures';
import { chart } from './support/project-page';
import { CHARTS } from './support/project';

test('velocity chart shows the calculator with iterations and an average', async ({ page }) => {
  await page.goto((await chart(CHARTS.velocity)).url);

  const panel = page.locator('.velocity-calculator-stats');
  await expect(panel).toBeVisible();
  await expect(panel.locator('#velocity-iterations-body tr').first()).toBeVisible();
  await expect(panel.locator('#velocity-result')).toContainText(/\d/);
  await expect(panel.locator('#velocity-result')).not.toContainText('NaN');
});
