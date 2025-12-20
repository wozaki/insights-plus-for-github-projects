// GitHub Burnup Predictor - Settings Module
// Responsibility: Manage user settings for velocity calculation

const DEFAULT_LOOKBACK_DAYS = 21;
const STORAGE_KEY_LOOKBACK_DAYS = 'lookbackDays';
const STORAGE_KEY_TARGET_DATE = 'targetDate';

/**
 * Get the lookback days setting from storage
 * @returns Promise resolving to the number of days to look back (default: 21)
 */
export async function getLookbackDays(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_LOOKBACK_DAYS);
    const days = result[STORAGE_KEY_LOOKBACK_DAYS];
    
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
    await chrome.storage.local.set({ [STORAGE_KEY_LOOKBACK_DAYS]: days });
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
    const result = await chrome.storage.local.get(STORAGE_KEY_TARGET_DATE);
    const dateString = result[STORAGE_KEY_TARGET_DATE];
    
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
    // Store as ISO string (YYYY-MM-DD format for date-only)
    const dateString = date.toISOString().split('T')[0];
    await chrome.storage.local.set({ [STORAGE_KEY_TARGET_DATE]: dateString });
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
    await chrome.storage.local.remove(STORAGE_KEY_TARGET_DATE);
  } catch (error) {
    console.error('Failed to clear target date setting:', error);
    throw error;
  }
}
