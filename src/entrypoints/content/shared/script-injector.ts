import type { BurnupChartData } from '../burnup/types';
import type { VelocityChartData } from '../velocity/types';

export type ChartDataResult = BurnupChartData | VelocityChartData | null;

const REQUEST_EVENT = 'insights-plus-request-data';
const RESPONSE_EVENT = 'burnup-chart-data';
const TIMEOUT_MS = 15000;

/**
 * Request chart data from the bridge content script running in MAIN world.
 * Sends a request event and waits for the response event.
 */
export function injectBridgeScript(): Promise<ChartDataResult> {
  return new Promise((resolve) => {
    let resolved = false;

    window.addEventListener(RESPONSE_EVENT, (e: Event) => {
      if (resolved) return;
      resolved = true;
      const customEvent = e as CustomEvent<ChartDataResult>;
      resolve(customEvent.detail);
    }, { once: true });

    window.dispatchEvent(new CustomEvent(REQUEST_EVENT));

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, TIMEOUT_MS);
  });
}
