import { existsSync } from 'node:fs';
import path from 'node:path';
import { seedDateAlertItems } from './support/seed';

export default async function globalSetup(): Promise<void> {
  const manifest = path.resolve(import.meta.dirname, '../.output/chrome-mv3/manifest.json');
  if (!existsSync(manifest)) {
    throw new Error('Extension build not found. Run `pnpm run build` before `pnpm e2e`.');
  }

  if (process.env.E2E_SKIP_SEED) return;
  await seedDateAlertItems();
}
