// Resolves e2e charts and views by name, so tests don't depend on the
// numbers GitHub assigned when they were created.

import { PROJECT } from './project';

interface ChartConfig {
  number: number;
  name: string;
  configuration: { time?: { period?: string; endDate?: string } };
}

interface View {
  number: number;
  name: string;
}

export interface ProjectPageData {
  charts: ChartConfig[];
  views: View[];
}

let cached: Promise<ProjectPageData> | null = null;

function readJsonScript<T>(html: string, id: string): T {
  const match = html.match(new RegExp(`<script type="application/json" id="${id}"[^>]*>([\\s\\S]*?)</script>`));
  if (!match?.[1]) throw new Error(`#${id} not found on ${PROJECT.url}; has GitHub changed the page?`);
  return JSON.parse(match[1]) as T;
}

export function loadProjectPage(): Promise<ProjectPageData> {
  cached ??= (async () => {
    // The project root serves the default view, whichever views exist.
    const res = await fetch(PROJECT.url);
    if (!res.ok) throw new Error(`GET ${PROJECT.url} failed: ${res.status}`);
    const html = await res.text();
    return {
      charts: readJsonScript<ChartConfig[]>(html, 'memex-charts-data'),
      views: readJsonScript<View[]>(html, 'memex-views'),
    };
  })();
  return cached;
}

export async function chart(name: string): Promise<ChartConfig & { url: string }> {
  const { charts } = await loadProjectPage();
  const found = charts.find((c) => c.name === name);
  if (!found) throw new Error(`Chart "${name}" not found in project ${PROJECT.number}; see e2e/README.md`);
  return { ...found, url: `${PROJECT.url}/insights/${found.number}` };
}

export async function viewUrl(name: string): Promise<string> {
  const { views } = await loadProjectPage();
  const found = views.find((v) => v.name === name);
  if (!found) throw new Error(`View "${name}" not found in project ${PROJECT.number}; see e2e/README.md`);
  return `${PROJECT.url}/views/${found.number}`;
}
