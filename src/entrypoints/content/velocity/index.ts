// GitHub Project Insights - Velocity Feature Entry Point

import type { VelocityChartData } from './types';
import { injectBridgeScript } from '../shared/script-injector';
import { createVelocityStatsPanel } from './stats-panel';
import './style.css';

export async function initializeVelocity(): Promise<void> {
  // Get chart data
  const data = await injectBridgeScript();
  if (!data || data.chartType !== 'velocity') {
    console.warn('[Velocity Calculator] No velocity chart data found');
    return;
  }
  
  const velocityData = data as VelocityChartData;
  if (!velocityData.iterations || velocityData.iterations.length === 0) {
    console.warn('[Velocity Calculator] No iteration data found');
    return;
  }

  // Create stats panel
  await createVelocityStatsPanel(velocityData);

  // Listen for storage changes to update when settings change
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.velocitySelectedIterations) {
      // Panel will auto-update through its own event handlers
    }
  });
}
