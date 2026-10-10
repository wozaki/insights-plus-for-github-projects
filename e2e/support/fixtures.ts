import { existsSync } from 'node:fs';
import path from 'node:path';
import { test as base, chromium, type BrowserContext } from '@playwright/test';

const EXTENSION_DIR = path.resolve(import.meta.dirname, '../../.output/chrome-mv3');

// Extensions need a persistent context. Playwright's bundled Chromium still
// honors --load-extension (branded Chrome dropped it), in headless mode too.
export const test = base.extend<{ context: BrowserContext }>({
  context: async ({ headless }, use) => {
    if (!existsSync(path.join(EXTENSION_DIR, 'manifest.json'))) {
      throw new Error('Extension build not found. Run `pnpm run build` before `pnpm e2e`.');
    }
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless,
      viewport: { width: 1440, height: 1000 },
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await use(context);
    await context.close();
  },
  // Reuse the tab the persistent context opens with, so Playwright's automatic
  // screenshots capture the page under test instead of a blank tab.
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
});

export { expect } from '@playwright/test';
