// GitHub Project Insights - Velocity Feature Entry Point

import type { VelocityChartData } from './types';
import { injectBridgeScript } from '../shared/script-injector';
import { createVelocityStatsPanel } from './stats-panel';
import { matchesStorageKey, generateStorageKey, STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS } from '../shared/storage-key';
import { removeLoadingPlaceholder } from '../shared/loading-placeholder';
import './style.css';

export async function initializeVelocity(): Promise<void> {
  // Get chart data
  const data = await injectBridgeScript();
  if (!data || data.chartType !== 'velocity') {
    removeLoadingPlaceholder();
    console.warn('[Velocity Calculator] No velocity chart data found');
    return;
  }
  
  const velocityData = data as VelocityChartData;
  if (!velocityData.iterations || velocityData.iterations.length === 0) {
    removeLoadingPlaceholder();
    console.warn('[Velocity Calculator] No iteration data found');
    return;
  }

  // Create stats panel
  await createVelocityStatsPanel(velocityData);

  // Listen for storage changes to update when settings change
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }
    
    // Check if any of the changed keys match our storage key patterns
    const currentKey = generateStorageKey(STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS);
    
    const shouldUpdate = Object.keys(changes).some(key => {
      // Check if the changed key matches our current key or base pattern
      return key === currentKey || matchesStorageKey(key, STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS);
    });
    
    if (shouldUpdate) {
      // Panel will auto-update through its own event handlers
    }
  });
}
