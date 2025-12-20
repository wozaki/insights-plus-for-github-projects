import { defineConfig } from 'wxt';

// @ts-ignore - vite is available via WXT's dependencies
import { loadEnv } from 'vite';

// See https://wxt.dev/api/config.html
// WXT can't load .env files until after the config file has been loaded.
// Use loadEnv to explicitly load environment variables from .env.local
const mode = process.env.MODE || process.env.NODE_ENV || 'development';
const env = loadEnv(mode, process.cwd());

export default defineConfig({
  srcDir: 'src',
  publicDir: 'src/public',
  manifest: {
    name: 'Insights Plus for GitHub Projects',
    description: 'Enhances GitHub Projects with insights like velocity prediction, completion date estimation, and more',
    permissions: ['activeTab', 'storage'],
    host_permissions: ['https://github.com/*'],
    web_accessible_resources: [
      {
        resources: ['highcharts-bridge.js'],
        matches: ['https://github.com/*'],
      },
    ],
    action: {
      default_icon: {
        '16': 'icons/icon16.svg',
        '48': 'icons/icon48.svg',
        '128': 'icons/icon128.svg',
      },
    },
    icons: {
      '16': 'icons/icon16.svg',
      '48': 'icons/icon48.svg',
      '128': 'icons/icon128.svg',
    },
  },
  webExt: {
    // Load URL to open on startup from environment variable
    // Use env loaded via loadEnv (no prefix needed in config files)
    // If not set, uses default behavior
    startUrls: env.VITE_DEV_START_BROWSER_URL ? [env.VITE_DEV_START_BROWSER_URL] : undefined,
    // Load user data directory from environment variable via chromiumArgs
    // If not set, uses default behavior
    chromiumArgs: env.VITE_DEV_BROWSER_USER_DATA_DIR
      ? [`--user-data-dir=${env.VITE_DEV_BROWSER_USER_DATA_DIR}`]
      : ['--user-data-dir=./.wxt/chrome-data'],
  },
});
