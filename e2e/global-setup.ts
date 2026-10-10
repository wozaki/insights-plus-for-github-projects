import { existsSync } from 'node:fs';
import path from 'node:path';

export default function globalSetup(): void {
  const manifest = path.resolve(import.meta.dirname, '../.output/chrome-mv3/manifest.json');
  if (!existsSync(manifest)) {
    throw new Error('Extension build not found. Run `pnpm run build` before `pnpm e2e`.');
  }
}
