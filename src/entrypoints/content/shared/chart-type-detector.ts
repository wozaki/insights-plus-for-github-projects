// GitHub Project Insights - Chart Type Detector Module
// Responsibility: Detect the type of Highcharts chart (Burnup vs Velocity/Column)

import type { ChartType } from './types';

/**
 * Detect the chart type from the Highcharts SVG structure
 * 
 * - Burnup (Stacked Area): Has `.highcharts-area` path elements
 * - Velocity (Column): Has column/bar shaped `.highcharts-point` elements
 */
export function detectChartType(): ChartType {
  const svg = document.querySelector('svg.highcharts-root');
  if (!svg) {
    return 'unknown';
  }

  // Check for stacked area chart (Burnup)
  const areaPath = svg.querySelector('.highcharts-series path.highcharts-area');
  if (areaPath) {
    return 'burnup';
  }

  // Check for column chart (Velocity)
  // Column charts have .highcharts-point elements with rect-like path data
  const columnPoints = svg.querySelectorAll('.highcharts-series .highcharts-point');
  if (columnPoints.length > 0) {
    // Check if the first point has a column-like path (starts with M and has rectangular shape)
    const firstPoint = columnPoints[0];
    const pathData = firstPoint.getAttribute('d');
    
    // Column chart paths typically have a closed rectangular shape
    // They contain multiple L (line) commands and end with Z (close)
    if (pathData && pathData.includes('L') && pathData.includes('Z')) {
      // Additional check: column charts in GitHub use aria-label with iteration info
      const ariaLabel = firstPoint.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Iteration') || ariaLabel.match(/\d+\.\s*\w+/))) {
        return 'velocity';
      }
    }
  }

  // Check for line graph elements (alternative burnup visualization)
  const graphPath = svg.querySelector('.highcharts-series path.highcharts-graph');
  if (graphPath) {
    return 'burnup';
  }

  return 'unknown';
}

/**
 * Wait for chart type to be detectable
 * Sometimes the chart takes time to render fully
 */
export async function waitForChartTypeDetection(maxAttempts: number = 10, intervalMs: number = 500): Promise<ChartType> {
  for (let i = 0; i < maxAttempts; i++) {
    const chartType = detectChartType();
    if (chartType !== 'unknown') {
      return chartType;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return 'unknown';
}
