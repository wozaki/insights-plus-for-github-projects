// GitHub Project Insights - Content Script (Main)
// This is the WXT content script entry point

import { defineContentScript } from 'wxt/utils/define-content-script';
import { isProjectInsightsPage, PROJECT_INSIGHTS_URL_PATTERNS } from './shared/page-detector';
import { waitForHighcharts } from './shared/highcharts-waiter';
import { waitForChartTypeDetection } from './shared/chart-type-detector';
import { initializeBurnup } from './burnup';
import { initializeVelocity } from './velocity';

export default defineContentScript({
  matches: PROJECT_INSIGHTS_URL_PATTERNS,
  runAt: 'document_idle',

  main() {
    let isInitialized = false;

    async function initialize(): Promise<void> {
      if (isInitialized) return;
      isInitialized = true;

      if (!isProjectInsightsPage()) {
        return;
      }

      const found = await waitForHighcharts();
      if (!found) {
        return;
      }

      // Detect chart type
      const chartType = await waitForChartTypeDetection();
      
      // Debug: console.warn(`[Project Insights] Detected chart type: ${chartType}`);

      // Initialize appropriate feature based on chart type
      if (chartType === 'burnup') {
        await initializeBurnup();
      } else if (chartType === 'velocity') {
        await initializeVelocity();
      } else {
        console.warn('[Project Insights] Unknown chart type, attempting burnup initialization');
        // Default to burnup for backwards compatibility
        await initializeBurnup();
      }
    }

    // Initialize after page load completes
    if (document.readyState === 'complete') {
      setTimeout(initialize, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(initialize, 1000));
    }

    // Support for SPA navigation
    let lastUrl = window.location.href;
    new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        isInitialized = false;
        
        // Clean up existing panels
        const burnupPanel = document.querySelector('.burnup-predictor-stats');
        if (burnupPanel) burnupPanel.remove();
        
        const velocityPanel = document.querySelector('.velocity-calculator-stats');
        if (velocityPanel) velocityPanel.remove();
        
        const overlay = document.getElementById('burnup-predictor-overlay');
        if (overlay) overlay.remove();
        
        const configWarning = document.querySelector('.burnup-config-warning');
        if (configWarning) configWarning.remove();
        
        setTimeout(initialize, 1000);
      }
    }).observe(document.body, { childList: true, subtree: true });
  },
});
