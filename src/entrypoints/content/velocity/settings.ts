// GitHub Project Insights - Velocity Settings Module
// Responsibility: Manage user settings for velocity calculation

const STORAGE_KEY_SELECTED_ITERATIONS = 'velocitySelectedIterations';
const DEFAULT_ITERATION_COUNT = 3;

/**
 * Get the selected iterations from storage
 * @returns Promise resolving to the array of selected iteration names
 */
export async function getSelectedIterations(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SELECTED_ITERATIONS);
    const iterations = result[STORAGE_KEY_SELECTED_ITERATIONS];
    
    // Validate the value
    if (Array.isArray(iterations)) {
      return iterations;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get selected iterations setting:', error);
    return [];
  }
}

/**
 * Set the selected iterations
 * @param iterations Array of iteration names to save
 * @returns Promise resolving when the setting is saved
 */
export async function setSelectedIterations(iterations: string[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY_SELECTED_ITERATIONS]: iterations });
  } catch (error) {
    console.error('Failed to set selected iterations setting:', error);
    throw error;
  }
}

/**
 * Get the default number of iterations to select
 */
export function getDefaultIterationCount(): number {
  return DEFAULT_ITERATION_COUNT;
}

/**
 * Get default selected iterations (last N iterations)
 * @param allIterations All available iteration names (sorted from oldest to newest)
 * @param count Number of iterations to select (default: 3)
 * @returns Array of iteration names to select by default
 */
export function getDefaultSelectedIterations(allIterations: string[], count: number = DEFAULT_ITERATION_COUNT): string[] {
  // Select the last N iterations (most recent)
  return allIterations.slice(-count);
}
