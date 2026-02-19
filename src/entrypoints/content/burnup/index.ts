// GitHub Burnup Predictor - Burnup Feature Entry Point

import type { Velocity, BurnupChartData } from './types';
import { injectBridgeScript } from '../shared/script-injector';
import { validateXAxis, validatePeriod } from './chart-config-validator';
import { showConfigWarning } from './config-warning';
import { calculateVelocity } from './velocity-calculator';
import { calculatePrediction } from './prediction-calculator';
import { createStatsPanel, updatePrediction } from './stats-panel';
import { drawOverlay } from './chart-overlay';
import { getLookbackDays, getTargetDate } from './settings';
import { matchesStorageKey, generateStorageKey, STORAGE_KEY_BURNUP_LOOKBACK_DAYS, STORAGE_KEY_BURNUP_TARGET_DATE } from '../shared/storage-key';
import { removeLoadingPlaceholder } from '../shared/loading-placeholder';
import './style.css';

export async function initializeBurnup(): Promise<void> {
  // Phase 1: Validate X-axis setting (DOM-only, no bridge script needed)
  const xAxisError = validateXAxis();
  if (xAxisError) {
    await removeLoadingPlaceholder();
    showConfigWarning([xAxisError]);
    return;
  }

  let chartData: BurnupChartData | null = null;
  let startDate: Date | null = null;
  let startValue = 0;
  let lastChartWidth = 0;

  async function recalculate(): Promise<void> {
    if (!chartData || !startDate) {
      return;
    }

    const lookbackDays = await getLookbackDays();

    const velocityResult = calculateVelocity(
      chartData.completedData, 
      startDate, 
      startValue,
      lookbackDays
    );
    const velocity: Velocity = {
      ...velocityResult,
      startDate,
      startValue,
    };

    // Get target date from user settings, fallback to chart's right edge
    let dueDate: Date | null = await getTargetDate();
    if (!dueDate) {
      // Fallback to chart's right edge (xMax)
      if (chartData.chartInfo?.axes?.xMax) {
        dueDate = new Date(chartData.chartInfo.axes.xMax);
      } else if (chartData.dateRange?.end) {
        dueDate = new Date(chartData.dateRange.end);
      }
    }

    const prediction = calculatePrediction(
      chartData, 
      velocity.current, 
      dueDate
    );

    await updatePrediction({
      current: velocity.current,
      ideal: prediction.idealVelocity,
    }, prediction);

    if (chartData.chartInfo) {
      drawOverlay(chartData.chartInfo, chartData, velocity, prediction);
    }
  }

  async function updateChartInfoAndRedraw(): Promise<void> {
    if (!chartData || !startDate) {
      return;
    }

    // Re-fetch chart info to get updated plotBox dimensions
    const updatedData = await injectBridgeScript();
    if (updatedData && updatedData.chartType === 'burnup' && updatedData.chartInfo) {
      chartData.chartInfo = updatedData.chartInfo;
      await recalculate();
    }
  }

  // Get chart data
  const data = await injectBridgeScript();
  if (!data || data.chartType !== 'burnup') {
    removeLoadingPlaceholder();
    console.warn('[Burnup Predictor] No burnup chart data found');
    return;
  }
  
  const burnupData = data as BurnupChartData;
  if (!burnupData.completedData || burnupData.completedData.length === 0) {
    removeLoadingPlaceholder();
    console.warn('[Burnup Predictor] No completed data found');
    return;
  }

  // Phase 2: Validate period setting (requires chart data)
  if (burnupData.chartInfo?.axes?.xMax) {
    const periodError = validatePeriod(burnupData.chartInfo.axes.xMax);
    if (periodError) {
      await removeLoadingPlaceholder();
      showConfigWarning([periodError]);
      return;
    }
  }

  chartData = burnupData;
  await createStatsPanel(burnupData);

  startDate = new Date(burnupData.chartInfo?.axes?.xMin || burnupData.dateRange?.start || Date.now());
  startValue = 0;
  
  if (burnupData.completedStartPixel && burnupData.chartInfo?.plotBox && burnupData.chartInfo?.axes) {
    const { plotHeight } = burnupData.chartInfo.plotBox;
    const { yMin, yMax } = burnupData.chartInfo.axes;
    // completedStartPixel.y is relative to the series group, so plotTop is not needed
    const ratio = (plotHeight - burnupData.completedStartPixel.y) / plotHeight;
    startValue = yMin + ratio * (yMax - yMin);
  } else if (burnupData.completedData && burnupData.completedData.length > 0) {
    const sortedData = [...burnupData.completedData]
      .map(p => ({ date: new Date(p.date), value: p.value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    startValue = sortedData[0].value;
  }

  await recalculate();

  // Listen for storage changes to recalculate when settings change
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }
    
    // Check if any of the changed keys match our storage key patterns
    const currentLookbackKey = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS);
    const currentTargetDateKey = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE);
    
    const shouldRecalculate = Object.keys(changes).some(key => {
      // Check if the changed key matches our current keys or base patterns
      return key === currentLookbackKey || 
             key === currentTargetDateKey ||
             matchesStorageKey(key, STORAGE_KEY_BURNUP_LOOKBACK_DAYS) ||
             matchesStorageKey(key, STORAGE_KEY_BURNUP_TARGET_DATE);
    });
    
    if (shouldRecalculate) {
      recalculate();
    }
  });

  // Observe chart container resize to redraw overlay when width changes
  const chartContainer = document.querySelector('.highcharts-container') as HTMLElement;
  if (chartContainer) {
    lastChartWidth = chartContainer.offsetWidth;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (newWidth !== lastChartWidth && newWidth > 0) {
          lastChartWidth = newWidth;
          // Debounce: wait a bit for Highcharts to finish resizing
          setTimeout(() => {
            updateChartInfoAndRedraw();
          }, 100);
        }
      }
    });

    observer.observe(chartContainer);
  }

  // Return cleanup function
  return;
}
