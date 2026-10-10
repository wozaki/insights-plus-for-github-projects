import { defineConfig } from '@playwright/test';

// E2E tests load the built extension and run against live GitHub pages.
// See e2e/README.md.
export default defineConfig({
  testDir: './e2e',
  // Tests share one live project; keep them serial to stay gentle on GitHub.
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    headless: true,
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'e2e',
      testIgnore: /capture\//,
    },
    {
      // Refreshes fixtures/github-pages for unit tests: pnpm fixtures:capture
      name: 'capture',
      testMatch: /capture\/.*\.ts$/,
      use: { screenshot: 'off' },
    },
  ],
});
