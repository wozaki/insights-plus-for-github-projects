// Date Field Alerts - List View URL Parser
// Responsibility: recognize GitHub Projects (table/list) view URLs and derive a
// stable per-project identity used for scoping stored settings.
//
// Note: the existing shared/url-parser is Insights-only, so this feature needs
// its own parser that also accepts non-insights project view URLs.

export interface ParsedProjectUrl {
  /** 'orgs:name' or 'users:name'. */
  orgOrUser: string;
  projectNumber: string;
  /** View number, or null for the bare /projects/N URL. */
  viewNumber: string | null;
}

/** URL match patterns for the content script (any project sub-page). */
export const PROJECT_URL_PATTERNS = [
  'https://github.com/orgs/*/projects/*',
  'https://github.com/users/*/projects/*',
];

/**
 * Parse a GitHub Projects URL. Accepts:
 * - https://github.com/{orgs|users}/{name}/projects/{n}
 * - https://github.com/{orgs|users}/{name}/projects/{n}/views/{m}
 * Returns null when the URL is not a project page.
 */
export function parseProjectUrl(url: string = window.location.href): ParsedProjectUrl | null {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return null;
  }
  if (urlObj.hostname !== 'github.com') return null;

  const parts = urlObj.pathname.split('/').filter((p) => p.length > 0);
  // [orgs|users, name, projects, number, (views, viewNumber)?]
  if (parts.length < 4) return null;

  const [type, name, projectsKeyword, projectNumber, viewsKeyword, viewNumber] = parts;
  if (type !== 'orgs' && type !== 'users') return null;
  if (projectsKeyword !== 'projects') return null;
  if (!/^\d+$/.test(projectNumber)) return null;

  let view: string | null = null;
  if (viewsKeyword === 'views' && viewNumber && /^\d+$/.test(viewNumber)) {
    view = viewNumber;
  }

  return {
    orgOrUser: `${type}:${name}`,
    projectNumber,
    viewNumber: view,
  };
}

/** True when the URL looks like a GitHub Projects page this feature may run on. */
export function isProjectPage(url: string = window.location.href): boolean {
  return parseProjectUrl(url) !== null;
}

/**
 * Stable per-project key for scoping stored settings, e.g. 'users:wozaki:4'.
 * Returns null when the URL is not a project page.
 */
export function projectKey(url: string = window.location.href): string | null {
  const parsed = parseProjectUrl(url);
  if (!parsed) return null;
  return `${parsed.orgOrUser}:${parsed.projectNumber}`;
}
