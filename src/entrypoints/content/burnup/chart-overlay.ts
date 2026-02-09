// GitHub Burnup Predictor - Chart Overlay Module
// Responsibility: Draw SVG overlay

import type { ChartInfo, BurnupChartData, Velocity, Prediction } from './types';
import { getOpenValueAtEndDate, getCompletedDataPoints } from './data-processor';

/**
 * Get current date in user's local timezone
 */
function getTodayLocal(): Date {
  const now = new Date();
  // Return date at midnight in user's local timezone
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Format date for display (e.g., "Aug 24")
 */
function formatDateShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Create a label group with semi-transparent background
 * @param text Label text
 * @param x X coordinate
 * @param y Y coordinate (base position)
 * @param color Background color
 * @param position Position relative to y ('above' or 'below')
 * @param rowOffset Additional vertical offset for stacking multiple labels (0 = first row, 1 = second row, etc.)
 */
function createLabel(
  text: string, 
  x: number, 
  y: number, 
  color: string,
  position: 'above' | 'below' = 'below',
  rowOffset: number = 0,
  align: 'center' | 'start' = 'center'
): SVGGElement {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  
  // Create text element first to measure it
  const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif');
  textEl.setAttribute('font-size', '11');
  textEl.setAttribute('font-weight', '600');
  textEl.setAttribute('fill', '#ffffff');
  textEl.textContent = text;
  
  // Position text based on position type
  // Each row is 25px apart to prevent overlapping
  const rowSpacing = 25;
  const baseOffsetY = position === 'above' ? -12 : 20;
  const offsetY = baseOffsetY + (rowOffset * rowSpacing);
  
  const estimatedWidth = text.length * 7 + 16;

  // Adjust x position and anchor based on alignment
  // 'start': rect starts at x, text centered within rect
  // 'center': rect and text centered at x
  const rectX = align === 'start' ? x : x - estimatedWidth / 2;
  const textX = rectX + estimatedWidth / 2;
  const textAnchor = 'middle';

  textEl.setAttribute('x', String(textX));
  textEl.setAttribute('y', String(y + offsetY));
  textEl.setAttribute('text-anchor', textAnchor);
  
  // Create background rect with semi-transparent fill
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('fill', color);
  rect.setAttribute('fill-opacity', '0.85');
  rect.setAttribute('rx', '4');
  rect.setAttribute('ry', '4');
  
  g.appendChild(rect);
  g.appendChild(textEl);
  
  const height = 20;
  rect.setAttribute('x', String(rectX));
  rect.setAttribute('y', String(y + offsetY - 14));
  rect.setAttribute('width', String(estimatedWidth));
  rect.setAttribute('height', String(height));
  
  return g;
}

/**
 * Create a vertical dashed line marker
 */
function createVerticalMarker(
  x: number, 
  plotTop: number, 
  plotHeight: number, 
  color: string,
  dashArray: string = '4,4'
): SVGLineElement {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(x));
  line.setAttribute('y1', String(plotTop));
  line.setAttribute('x2', String(x));
  line.setAttribute('y2', String(plotTop + plotHeight));
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-dasharray', dashArray);
  line.setAttribute('opacity', '0.8');
  return line;
}

/**
 * Create a point marker (circle)
 */
function createPointMarker(x: number, y: number, color: string): SVGCircleElement {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(x));
  circle.setAttribute('cy', String(y));
  circle.setAttribute('r', '5');
  circle.setAttribute('fill', color);
  circle.setAttribute('stroke', '#ffffff');
  circle.setAttribute('stroke-width', '2');
  return circle;
}

/**
 * Draw SVG overlay
 */
export function drawOverlay(chartInfo: ChartInfo, data: BurnupChartData, velocity: Velocity, prediction: Prediction): void {
  const existingOverlay = document.getElementById('burnup-predictor-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const svg = document.querySelector('.highcharts-root') as SVGSVGElement | null;
  if (!svg || !chartInfo.plotBox) {
    return;
  }

  if (!data.completedData || data.completedData.length === 0) {
    return;
  }

  const { plotLeft, plotTop, plotWidth, plotHeight } = chartInfo.plotBox;
  const { xMin, xMax, yMin, yMax } = chartInfo.axes;

  // Calculate X coordinate from date (relative coordinates within plot area)
  const toRelativeX = (date: Date | string): number => {
    const time = date instanceof Date ? date.getTime() : new Date(date).getTime();
    const ratio = (time - xMin) / (xMax - xMin);
    return ratio * plotWidth;
  };

  // Calculate Y coordinate from value (relative coordinates within plot area)
  const toRelativeY = (value: number): number => {
    const ratio = (value - yMin) / (yMax - yMin);
    return plotHeight - ratio * plotHeight;
  };

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.id = 'burnup-predictor-overlay';

  // Get the first point and today's point from Completed data
  const { first: firstCompletedPoint, today: todayCompletedPoint } = 
    getCompletedDataPoints(data.completedData);
  
  if (!firstCompletedPoint || !todayCompletedPoint) {
    return;
  }

  // Get the target value (Open/Total at the end)
  const targetValue = data.total;
  const targetY = plotTop + toRelativeY(targetValue);

  // Draw current velocity line (dashed)
  // Use the period information from velocity calculation
  if (velocity.current && velocity.periodStartDate && velocity.periodEndDate && 
      velocity.periodStartValue !== null && velocity.periodStartValue !== undefined &&
      velocity.periodEndValue !== null && velocity.periodEndValue !== undefined) {
    
    // Calculate coordinates for the period start and end points
    const periodStartX = plotLeft + toRelativeX(velocity.periodStartDate);
    const periodStartY = plotTop + toRelativeY(velocity.periodStartValue);
    const periodEndX = plotLeft + toRelativeX(velocity.periodEndDate);
    const periodEndY = plotTop + toRelativeY(velocity.periodEndValue);
    
    // Calculate slope from the period
    const deltaX = periodEndX - periodStartX;
    const deltaY = periodEndY - periodStartY;
    
    if (deltaX > 0) {
      const slope = deltaY / deltaX;
      
      // Determine the natural start point for the line
      // Start from the left edge of the plot area, or from periodStartX if it's within the plot
      const lineStartX = Math.max(plotLeft, periodStartX);
      const lineStartY = periodStartY + slope * (lineStartX - periodStartX);
      
      // Calculate where the line intersects with the target value (Open/Total)
      // targetY = lineStartY + slope * (intersectX - lineStartX)
      // intersectX = lineStartX + (targetY - lineStartY) / slope
      let predictedEndX: number | null = null;
      if (slope !== 0) {
        const intersectX = lineStartX + (targetY - lineStartY) / slope;
        
        // Only use if within reasonable range (not too far in the future)
        const maxX = plotLeft + plotWidth * 2; // Allow up to 2x the plot width
        const todayX = plotLeft + toRelativeX(todayCompletedPoint.date);
        if (intersectX > todayX && intersectX < maxX) {
          predictedEndX = intersectX;
        }
      }
      
      // Calculate end point based on slope (extend to end of plotWidth or intersection)
      const lineEndX = Math.min(plotLeft + plotWidth, predictedEndX || plotLeft + plotWidth);
      const endY = lineStartY + slope * (lineEndX - lineStartX);

      const currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      currentLine.setAttribute('x1', String(lineStartX));
      currentLine.setAttribute('y1', String(lineStartY));
      currentLine.setAttribute('x2', String(lineEndX));
      currentLine.setAttribute('y2', String(endY));
      currentLine.setAttribute('stroke', '#58a6ff');
      currentLine.setAttribute('stroke-width', '2');
      currentLine.setAttribute('stroke-dasharray', '6,4');
      currentLine.setAttribute('opacity', '0.8');
      g.appendChild(currentLine);

      // Draw predicted end date marker and label
      // Use prediction.completionDate for label to ensure consistency with stats panel
      if (predictedEndX && predictedEndX <= plotLeft + plotWidth && prediction.completionDate) {
        // Vertical dashed line at predicted end date
        const predictedMarker = createVerticalMarker(predictedEndX, plotTop, plotHeight, '#58a6ff');
        g.appendChild(predictedMarker);
        
        // Point marker at intersection
        const predictedPoint = createPointMarker(predictedEndX, targetY, '#58a6ff');
        g.appendChild(predictedPoint);
        
        // Label showing predicted end date (at bottom, row 2)
        // Use prediction.completionDate for consistency with stats panel
        const predictedLabel = createLabel(
          `Predicted: ${formatDateShort(prediction.completionDate)}`,
          predictedEndX,
          plotTop + plotHeight,
          '#58a6ff',
          'below',
          2  // Third row (below Today and Target)
        );
        g.appendChild(predictedLabel);
      }
    }
  }

  // Start point for ideal velocity line: Get from completedStartPixel (SVG path coordinates + plotLeft/plotTop)
  // SVG path coordinates are relative to the series group, so add plotLeft/plotTop
  let startX: number, startY: number;
  if (data.completedStartPixel) {
    startX = plotLeft + data.completedStartPixel.x;
    startY = plotTop + data.completedStartPixel.y;
  } else {
    startX = plotLeft + toRelativeX(firstCompletedPoint.date);
    startY = plotTop + toRelativeY(firstCompletedPoint.value);
  }

  // Draw ideal velocity line
  // Start point: First point of Completed
  // End point: Y coordinate of Open at the due date
  if (prediction.dueDate) {
    // Use the value of Open at the end date for the end point's Y coordinate
    const openValueAtEnd = getOpenValueAtEndDate(
      data.openData || [], 
      prediction.dueDate
    );
    const endValue = openValueAtEnd !== null ? openValueAtEnd : data.total;
    
    // Calculate X coordinate from dueDate (may be outside chart range)
    const dueDateRelativeX = toRelativeX(prediction.dueDate);
    const idealEndX = plotLeft + dueDateRelativeX;
    const idealEndY = plotTop + toRelativeY(endValue);

    if (!isNaN(idealEndX) && !isNaN(idealEndY) && !isNaN(startX) && !isNaN(startY)) {
      // Calculate the slope of the ideal line
      const idealSlope = (idealEndY - startY) / (idealEndX - startX);
      
      // Clip the line to the plot area if dueDate is outside chart range
      let clippedEndX = idealEndX;
      let clippedEndY = idealEndY;
      
      // If dueDate is beyond the chart's right edge, clip to right edge
      if (dueDateRelativeX > plotWidth) {
        clippedEndX = plotLeft + plotWidth;
        clippedEndY = startY + idealSlope * (clippedEndX - startX);
      }
      // If dueDate is before the chart's left edge, skip drawing (shouldn't happen normally)
      if (dueDateRelativeX < 0) {
        // Don't draw the line
      } else {
        const idealLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        idealLine.setAttribute('x1', String(startX));
        idealLine.setAttribute('y1', String(startY));
        idealLine.setAttribute('x2', String(clippedEndX));
        idealLine.setAttribute('y2', String(clippedEndY));
        idealLine.setAttribute('stroke', '#f5a623');
        idealLine.setAttribute('stroke-width', '2');
        idealLine.setAttribute('stroke-dasharray', '6,4');
        idealLine.setAttribute('opacity', '0.8');
        g.appendChild(idealLine);

        // Draw due date marker only if within chart range
        if (dueDateRelativeX >= 0 && dueDateRelativeX <= plotWidth) {
          // Vertical dashed line at due date
          const desiredMarker = createVerticalMarker(idealEndX, plotTop, plotHeight, '#f5a623');
          g.appendChild(desiredMarker);
          
          // Point marker at intersection
          const desiredPoint = createPointMarker(idealEndX, idealEndY, '#f5a623');
          g.appendChild(desiredPoint);
          
          // Add label showing due date (at bottom, row 1)
          const dueDateLabel = createLabel(
            `Target: ${formatDateShort(prediction.dueDate)}`,
            idealEndX,
            plotTop + plotHeight,
            '#f5a623',
            'below',
            1  // Second row (below Today)
          );
          g.appendChild(dueDateLabel);
        }
      }
    }
  }

  // Draw scope target line (horizontal dashed line showing where Completed needs to reach)
  // In stacked charts with Duplicate/other done-like statuses, this line sits below the Open line
  // by the amount of those statuses, clearly indicating the completion goal.
  const scopeTargetLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  scopeTargetLine.setAttribute('x1', String(plotLeft));
  scopeTargetLine.setAttribute('y1', String(targetY));
  scopeTargetLine.setAttribute('x2', String(plotLeft + plotWidth));
  scopeTargetLine.setAttribute('y2', String(targetY));
  scopeTargetLine.setAttribute('stroke', '#cbe044');
  scopeTargetLine.setAttribute('stroke-width', '2');
  scopeTargetLine.setAttribute('stroke-dasharray', '2,2');
  scopeTargetLine.setAttribute('opacity', '0.8');
  g.appendChild(scopeTargetLine);

  // Scope target label (at the left edge of the line, with small inset to avoid clipping)
  const scopeTargetLabel = createLabel(
    'Scope target',
    plotLeft + 4,
    targetY,
    '#cbe044',
    'above',
    0,
    'start'
  );
  g.appendChild(scopeTargetLabel);

  // Draw Today marker (using user's local timezone)
  const todayLocal = getTodayLocal();
  const todayRelativeX = toRelativeX(todayLocal);
  if (todayRelativeX >= 0 && todayRelativeX <= plotWidth) {
    const todayMarkerX = plotLeft + todayRelativeX;
    
    // Vertical line for today
    const todayLine = createVerticalMarker(todayMarkerX, plotTop, plotHeight, '#3fb950', '2,2');
    g.appendChild(todayLine);
    
    // Today label (at bottom, row 0 - first row)
    const todayLabel = createLabel('Today', todayMarkerX, plotTop + plotHeight, '#3fb950', 'below', 0);
    g.appendChild(todayLabel);
  }

  svg.appendChild(g);
}
