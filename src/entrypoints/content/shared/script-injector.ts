// GitHub Project Insights - Script Injector Module
// Responsibility: Inject script to retrieve Highcharts data

import type { BurnupChartData } from '../burnup/types';
import type { VelocityChartData } from '../velocity/types';

export type ChartDataResult = BurnupChartData | VelocityChartData | null;

/**
 * Inject script to retrieve Highcharts data
 */
export function injectBridgeScript(): Promise<ChartDataResult> {
  return new Promise((resolve) => {
    let chartData: ChartDataResult = null;

    window.addEventListener('burnup-chart-data', (e: Event) => {
      const customEvent = e as CustomEvent<ChartDataResult>;
      chartData = customEvent.detail;
      resolve(chartData);
    }, { once: true });

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('/highcharts-bridge.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    setTimeout(() => {
      if (!chartData) {
        resolve(null);
      }
    }, 10000);
  });
}
