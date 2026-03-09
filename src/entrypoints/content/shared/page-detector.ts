// GitHub Project Insights - Page Detector Module
// Responsibility: Detect if the current page is a GitHub Project Insights page

/**
 * URL patterns that match GitHub Project Insights pages
 * Used by both manifest matches and runtime URL checking
 */
export const PROJECT_INSIGHTS_URL_PATTERNS = [
  'https://github.com/orgs/*/projects/*/insights*',
  'https://github.com/users/*/projects/*/insights*',
];

/**
 * Convert manifest match pattern to regex
 * Converts wildcards (*) to regex pattern [^/]*
 */
function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters and convert wildcards
  // Note: projects/* should match numeric project IDs, but we use [^/]* for flexibility
  const escaped = pattern
    // First escape all regex metacharacters, including backslashes
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Then convert escaped wildcards ("\*") into a character class that matches any
    // characters except "/", preserving the original intent of the manifest-style pattern.
    .replace(/\\\*/g, '[^/]*');

  return new RegExp(escaped);
}

/**
 * Check if the current page is a GitHub Project Insights page
 */
export function isProjectInsightsPage(): boolean {
  return PROJECT_INSIGHTS_URL_PATTERNS.some(pattern => 
    patternToRegex(pattern).test(window.location.href)
  );
}
