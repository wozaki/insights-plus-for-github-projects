// GitHub Project Insights - Highcharts Waiter Module
// Responsibility: Wait for Highcharts to load

const MAX_WAIT_TIME_MS = 30000; // 30 seconds
const CHECK_INTERVAL_MS = 500;

/**
 * Wait for Highcharts to load
 * @returns Promise that resolves to true if found, false if timeout
 */
export function waitForHighcharts(): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = () => {
      if (document.querySelector('.highcharts-container')) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime >= MAX_WAIT_TIME_MS) {
        console.warn('[Project Insights] Highcharts not found after timeout');
        resolve(false);
        return;
      }
      
      setTimeout(check, CHECK_INTERVAL_MS);
    };
    check();
  });
}
