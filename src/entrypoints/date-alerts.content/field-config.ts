// Date Field Alerts - Field Config Storage
// Responsibility: persist per-project Start/End field mappings in
// chrome.storage.local using the spec's JSON shape.

import type { DateFieldMapping } from './types';

/** Single storage key holding a map of projectKey -> mapping. */
export const DATE_FIELD_MAPPING_STORAGE_KEY = 'insights-plus-date-field-mappings';

type MappingStore = Record<string, DateFieldMapping>;

/** Get the mapping for a project, or null when unset/invalid. */
export async function getMapping(projectKey: string): Promise<DateFieldMapping | null> {
  try {
    const result = await chrome.storage.local.get(DATE_FIELD_MAPPING_STORAGE_KEY);
    const store = (result[DATE_FIELD_MAPPING_STORAGE_KEY] ?? {}) as MappingStore;
    const mapping = store[projectKey];
    return isValidMapping(mapping) ? mapping : null;
  } catch (error) {
    console.error('[Date Field Alerts] Failed to read mapping:', error);
    return null;
  }
}

/** Save the mapping for a project. */
export async function setMapping(projectKey: string, mapping: DateFieldMapping): Promise<void> {
  try {
    const result = await chrome.storage.local.get(DATE_FIELD_MAPPING_STORAGE_KEY);
    const store = (result[DATE_FIELD_MAPPING_STORAGE_KEY] ?? {}) as MappingStore;
    store[projectKey] = { startFieldId: mapping.startFieldId, endFieldId: mapping.endFieldId };
    await chrome.storage.local.set({ [DATE_FIELD_MAPPING_STORAGE_KEY]: store });
  } catch (error) {
    console.error('[Date Field Alerts] Failed to save mapping:', error);
    throw error;
  }
}

/** True when a storage change event touches this feature's key. */
export function isMappingChange(changes: Record<string, chrome.storage.StorageChange>): boolean {
  return Object.prototype.hasOwnProperty.call(changes, DATE_FIELD_MAPPING_STORAGE_KEY);
}

/** A mapping is valid when both field ids are present, non-empty, and distinct. */
export function isValidMapping(mapping: DateFieldMapping | undefined | null): mapping is DateFieldMapping {
  return (
    !!mapping &&
    typeof mapping.startFieldId === 'string' &&
    typeof mapping.endFieldId === 'string' &&
    mapping.startFieldId.length > 0 &&
    mapping.endFieldId.length > 0
  );
}
