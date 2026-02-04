// GitHub Burnup Predictor - Settings Module
// Responsibility: Manage user settings for velocity calculation

import { generateStorageKey, STORAGE_KEY_BURNUP_LOOKBACK_DAYS, STORAGE_KEY_BURNUP_TARGET_DATE } from '../shared/storage-key';

const DEFAULT_LOOKBACK_DAYS = 21;

/**
 * Get the lookback days setting from storage
 * @returns Promise resolving to the number of days to look back (default: 21)
 */
export async function getLookbackDays(): Promise<number> {
  try {
    const storageKey = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS);
    const result = await chrome.storage.local.get(storageKey);
    const days = result[storageKey];
    
    // Validate the value
    if (typeof days === 'number' && days >= 1 && days <= 365) {
      return days;
    }
    
    return DEFAULT_LOOKBACK_DAYS;
  } catch (error) {
    console.error('Failed to get lookback days setting:', error);
    return DEFAULT_LOOKBACK_DAYS;
  }
}

/**
 * Set the lookback days setting
 * @param days Number of days to look back (must be between 1 and 365)
 * @returns Promise resolving when the setting is saved
 */
export async function setLookbackDays(days: number): Promise<void> {
  // Validate the value
  if (typeof days !== 'number' || days < 1 || days > 365) {
    throw new Error('Lookback days must be between 1 and 365');
  }
  
  try {
    const storageKey = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS);
    await chrome.storage.local.set({ [storageKey]: days });
  } catch (error) {
    console.error('Failed to set lookback days setting:', error);
    throw error;
  }
}

/**
 * Get the default lookback days value
 */
export function getDefaultLookbackDays(): number {
  return DEFAULT_LOOKBACK_DAYS;
}

/**
 * Get the target date setting from storage
 * @returns Promise resolving to the target date, or null if not set
 */
export async function getTargetDate(): Promise<Date | null> {
  try {
    const storageKey = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE);
    const result = await chrome.storage.local.get(storageKey);
    const dateString = result[storageKey];
    
    if (typeof dateString === 'string' && dateString) {
      const date = new Date(dateString);
      // Validate the date
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get target date setting:', error);
    return null;
  }
}

/**
 * Set the target date setting
 * @param date The target date to set
 * @returns Promise resolving when the setting is saved
 */
export async function setTargetDate(date: Date): Promise<void> {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  try {
    const storageKey = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE);
    // Store as ISO string (YYYY-MM-DD format for date-only)
    const dateString = date.toISOString().split('T')[0];
    await chrome.storage.local.set({ [storageKey]: dateString });
  } catch (error) {
    console.error('Failed to set target date setting:', error);
    throw error;
  }
}

/**
 * Clear the target date setting (revert to using chart's right edge)
 * @returns Promise resolving when the setting is cleared
 */
export async function clearTargetDate(): Promise<void> {
  try {
    const storageKey = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE);
    await chrome.storage.local.remove(storageKey);
  } catch (error) {
    console.error('Failed to clear target date setting:', error);
    throw error;
  }
}
