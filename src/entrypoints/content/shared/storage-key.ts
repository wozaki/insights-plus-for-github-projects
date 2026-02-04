// GitHub Project Insights - Storage Key Generator Module
// Responsibility: Generate unique storage keys based on URL context

import { parseProjectInsightsUrl } from './url-parser';

/**
 * Base storage keys for different settings
 * These are combined with URL context to create unique keys per chart
 */
export const STORAGE_KEY_BURNUP_LOOKBACK_DAYS = 'burnup-lookbackDays';
export const STORAGE_KEY_BURNUP_TARGET_DATE = 'burnup-targetDate';
export const STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS = 'velocity-SelectedIterations';

/**
 * Type for valid storage key names
 */
export type StorageKey = 
  | typeof STORAGE_KEY_BURNUP_LOOKBACK_DAYS
  | typeof STORAGE_KEY_BURNUP_TARGET_DATE
  | typeof STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS;

/**
 * Generate a unique storage key based on the current URL context
 * 
 * Format: {baseKey}:{org-or-user}:{project-number}:{insight-number}
 * Example: "burnup-lookbackDays:orgs:myorg:123:456"
 * 
 * If URL parsing fails, returns the base key for backward compatibility.
 * 
 * @param baseKey The base storage key (use STORAGE_KEY_* constants)
 * @param url Optional URL to parse (defaults to window.location.href)
 * @returns Unique storage key or base key if URL parsing fails
 */
export function generateStorageKey(baseKey: StorageKey, url?: string): string {
  const parsed = parseProjectInsightsUrl(url);
  
  if (!parsed) {
    // Fallback to base key for backward compatibility
    return baseKey;
  }
  
  return `${baseKey}:${parsed.orgOrUser}:${parsed.projectNumber}:${parsed.insightNumber}`;
}

/**
 * Check if a storage key matches a base key pattern (for storage change listeners)
 * 
 * This function checks if a key starts with the base key followed by a colon,
 * which indicates it's a URL-based key, or if it exactly matches the base key
 * (for backward compatibility with old keys).
 * 
 * @param key The storage key to check (can be any string from storage)
 * @param baseKey The base key pattern to match (use STORAGE_KEY_* constants)
 * @returns True if the key matches the base key pattern
 */
export function matchesStorageKey(key: string, baseKey: StorageKey): boolean {
  // Exact match (backward compatibility)
  if (key === baseKey) {
    return true;
  }
  
  // Pattern match: baseKey:orgs:... or baseKey:users:...
  const pattern = new RegExp(`^${baseKey}:(orgs|users):`);
  return pattern.test(key);
}
