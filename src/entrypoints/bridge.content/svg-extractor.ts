interface PlotBox {
  plotLeft: number;
  plotTop: number;
  plotWidth: number;
  plotHeight: number;
}

interface PixelPoint {
  x: number;
  y: number;
}

interface DataPoint {
  date: Date;
  value: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface IterationData {
  name: string;
  estimate: number;
  groupName?: string;
  index: number;
}

interface SeriesData {
  index: number;
  color: string | null;
  points: DataPoint[];
  startPixel: PixelPoint | null;
  lastPixel: PixelPoint | null;
}

interface PointMarkerValues {
  open: number | null;
  completed: number | null;
}

export interface VelocityChartResult {
  chartType: 'velocity';
  iterations: IterationData[];
  chartInfo: {
    plotBox: PlotBox;
    axes: { xMin: number; xMax: number; yMin: number; yMax: number };
  };
}

export interface BurnupChartResult {
  chartType: 'burnup';
  total: number;
  completed: number;
  completedData: DataPoint[];
  openData: DataPoint[];
  completedStartPixel: PixelPoint | null;
  completedLastPixel: PixelPoint | null;
  dateRange: DateRange | null;
  chartInfo: {
    plotBox: PlotBox;
    axes: { xMin: number; xMax: number; yMin: number; yMax: number };
  };
}

export type ChartDataResult = BurnupChartResult | VelocityChartResult | null;

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
};

export function detectChartType(svg: Element): 'burnup' | 'velocity' | 'unknown' {
  if (!svg) return 'unknown';

  const areaPath = svg.querySelector('.highcharts-series path.highcharts-area');
  if (areaPath) {
    return 'burnup';
  }

  const columnPoints = svg.querySelectorAll('.highcharts-series .highcharts-point');
  if (columnPoints.length > 0) {
    const firstPoint = columnPoints[0];
    const pathData = firstPoint.getAttribute('d');

    if (pathData && pathData.includes('L') && pathData.includes('Z')) {
      const ariaLabel = firstPoint.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Iteration') || /\d+(\.\d+)?\.\s*\w+/.test(ariaLabel))) {
        return 'velocity';
      }
    }
  }

  const graphPath = svg.querySelector('.highcharts-series path.highcharts-graph');
  if (graphPath) {
    return 'burnup';
  }

  return 'unknown';
}

export function extractFromColumnChart(svg: Element): VelocityChartResult | null {
  const plotBackground = svg.querySelector('.highcharts-plot-background');
  if (!plotBackground) {
    return null;
  }

  const plotBox: PlotBox = {
    plotLeft: parseFloat(plotBackground.getAttribute('x') || '0') || 0,
    plotTop: parseFloat(plotBackground.getAttribute('y') || '0') || 0,
    plotWidth: parseFloat(plotBackground.getAttribute('width') || '0') || 0,
    plotHeight: parseFloat(plotBackground.getAttribute('height') || '0') || 0,
  };

  const yAxisLabels = svg.querySelectorAll('.highcharts-yaxis-labels text');
  const yValues: { value: number; y: number }[] = [];
  yAxisLabels.forEach(label => {
    const text = (label.textContent || '').trim();
    const y = parseFloat(label.getAttribute('y') || '0') || 0;
    const value = parseFloat(text.replace(/,/g, ''));
    if (!isNaN(value)) {
      yValues.push({ value, y });
    }
  });

  const yMin = yValues.length > 0 ? Math.min(...yValues.map(v => v.value)) : 0;
  const yMax = yValues.length > 0 ? Math.max(...yValues.map(v => v.value)) : 100;

  const iterations: IterationData[] = [];
  const columnPoints = svg.querySelectorAll('.highcharts-series .highcharts-point');

  columnPoints.forEach((point, index) => {
    const ariaLabel = point.getAttribute('aria-label');
    if (!ariaLabel) return;

    const match = ariaLabel.match(/^(.+?),\s*([\d.]+)\.\s*(.*)$/);
    if (!match) return;

    const name = match[1].trim();
    const estimate = parseFloat(match[2]);
    const groupName = match[3].replace(/\.$/, '').trim() || undefined;

    if (!isNaN(estimate)) {
      iterations.push({ name, estimate, groupName, index });
    }
  });

  iterations.sort((a, b) => a.index - b.index);

  return {
    chartType: 'velocity',
    iterations,
    chartInfo: {
      plotBox,
      axes: {
        xMin: 0,
        xMax: iterations.length - 1,
        yMin,
        yMax,
      },
    },
  };
}

export function extractFromSVG(): ChartDataResult {
  const svg = document.querySelector('svg.highcharts-root');
  if (!svg) {
    return null;
  }

  const chartType = detectChartType(svg);

  if (chartType === 'velocity') {
    return extractFromColumnChart(svg);
  }

  const plotBackground = svg.querySelector('.highcharts-plot-background');
  if (!plotBackground) {
    return null;
  }

  const plotBox: PlotBox = {
    plotLeft: parseFloat(plotBackground.getAttribute('x') || '0') || 0,
    plotTop: parseFloat(plotBackground.getAttribute('y') || '0') || 0,
    plotWidth: parseFloat(plotBackground.getAttribute('width') || '0') || 0,
    plotHeight: parseFloat(plotBackground.getAttribute('height') || '0') || 0,
  };

  const xAxisLabels = svg.querySelectorAll('.highcharts-xaxis-labels text');
  const xDates: { text: string; x: number }[] = [];
  xAxisLabels.forEach(label => {
    const text = (label.textContent || '').trim();
    const x = parseFloat(label.getAttribute('x') || '0') || 0;
    xDates.push({ text, x });
  });

  const yAxisLabels = svg.querySelectorAll('.highcharts-yaxis-labels text');
  const yValues: { value: number; y: number }[] = [];
  yAxisLabels.forEach(label => {
    const text = (label.textContent || '').trim();
    const y = parseFloat(label.getAttribute('y') || '0') || 0;
    const value = parseFloat(text.replace(/,/g, ''));
    if (!isNaN(value)) {
      yValues.push({ value, y });
    }
  });

  const yMin = Math.min(...yValues.map(v => v.value));
  const yMax = Math.max(...yValues.map(v => v.value));
  const dateRange = extractDateRangeFromLabels(xDates);

  const legendItems = svg.querySelectorAll('.highcharts-legend-item');
  const seriesInfo: { name: string; color: string | null; index: number }[] = [];

  legendItems.forEach((item, i) => {
    const text = (item.textContent || '').trim();
    const rect = item.querySelector('rect');
    const path = item.querySelector('path');
    let color: string | null = null;

    if (rect) {
      color = rect.getAttribute('fill');
    } else if (path) {
      color = path.getAttribute('stroke') || path.getAttribute('fill');
    }

    if (text) {
      seriesInfo.push({ name: text, color, index: i });
    }
  });

  const seriesGroups = svg.querySelectorAll('.highcharts-series-group .highcharts-series');
  const seriesData: SeriesData[] = [];

  seriesGroups.forEach((group, i) => {
    const areaPath = group.querySelector('path.highcharts-area');
    const graphPath = group.querySelector('path.highcharts-graph');

    let color: string | null = null;
    let pathElement: Element | null = null;

    if (graphPath) {
      color = graphPath.getAttribute('stroke');
      pathElement = graphPath;
    }
    if (areaPath) {
      color = color || areaPath.getAttribute('fill');
      pathElement = pathElement || areaPath;
    }

    if (pathElement) {
      const pathD = pathElement.getAttribute('d');
      const points = parsePathData(pathD, plotBox, dateRange, yMin, yMax);
      const startPixel = extractFirstPointFromPath(pathD);
      const lastPixel = extractLastPointFromPath(pathD, plotBox);

      seriesData.push({ index: i, color, points, startPixel, lastPixel });
    }
  });

  let completedData: DataPoint[] = [];
  let openData: DataPoint[] = [];
  let completedStartPixel: PixelPoint | null = null;
  let completedLastPixel: PixelPoint | null = null;

  for (const legend of seriesInfo) {
    const name = legend.name.toLowerCase();

    if (name.includes('completed') || name.includes('完了')) {
      const series = findSeriesByLegendIndex(seriesData, legend.index);
      if (series) {
        completedData = series.points;
        completedStartPixel = series.startPixel;
        completedLastPixel = series.lastPixel;
      }
    } else if (name.includes('open') || name.includes('オープン')) {
      const series = findSeriesByLegendIndex(seriesData, legend.index);
      if (series) {
        openData = series.points;
      }
    }
  }

  if (completedData.length === 0 && openData.length === 0 && seriesData.length >= 2) {
    const series0LastValue = seriesData[0].points.length > 0
      ? seriesData[0].points[seriesData[0].points.length - 1].value
      : 0;
    const series1LastValue = seriesData[1].points.length > 0
      ? seriesData[1].points[seriesData[1].points.length - 1].value
      : 0;

    if (series0LastValue > series1LastValue) {
      openData = seriesData[0].points;
      completedData = seriesData[1].points;
      completedStartPixel = seriesData[1].startPixel;
      completedLastPixel = seriesData[1].lastPixel;
    } else {
      openData = seriesData[1].points;
      completedData = seriesData[0].points;
      completedStartPixel = seriesData[0].startPixel;
      completedLastPixel = seriesData[0].lastPixel;
    }
  } else if (completedData.length === 0 && seriesData.length >= 1) {
    completedData = seriesData[0].points;
    completedStartPixel = seriesData[0].startPixel;
    completedLastPixel = seriesData[0].lastPixel;
  }

  const pointValues = extractValuesFromPointMarkers(svg);

  // In GitHub's burnup chart, "Open" series represents Total Scope, not remaining items
  let total = 0;
  let completed = 0;

  if (pointValues.open !== null) {
    total = pointValues.open;
  } else if (openData.length > 0) {
    total = Math.round(openData[openData.length - 1].value);
  }

  if (pointValues.completed !== null) {
    completed = pointValues.completed;
  } else if (completedData.length > 0) {
    completed = Math.round(completedData[completedData.length - 1].value);
  }

  // Total = Open (remaining) + Completed
  if (pointValues.open !== null && pointValues.completed !== null) {
    total = pointValues.open + pointValues.completed;
  }

  if (completed > total && total > 0) {
    [completed, total] = [total, completed];
    [completedData, openData] = [openData, completedData];
  }

  const finalDateRange = dateRange || extractDateRangeFromPage();

  return {
    chartType: 'burnup',
    total,
    completed,
    completedData,
    openData,
    completedStartPixel,
    completedLastPixel,
    dateRange: finalDateRange,
    chartInfo: {
      plotBox,
      axes: {
        xMin: finalDateRange?.start?.getTime() || 0,
        xMax: finalDateRange?.end?.getTime() || Date.now(),
        yMin,
        yMax: yMax || total,
      },
    },
  };
}

function findSeriesByLegendIndex(seriesData: SeriesData[], legendIndex: number): SeriesData | null {
  if (legendIndex < seriesData.length) {
    return seriesData[legendIndex];
  }
  return null;
}

/**
 * Extract accurate values from point markers' aria-label.
 * aria-label format: "Dec 19, 48. Completed." or "Dec 19, 48. Open."
 */
export function extractValuesFromPointMarkers(svg: Element): PointMarkerValues {
  const result: PointMarkerValues = { open: null, completed: null };

  const allPoints = svg.querySelectorAll('.highcharts-point');

  const openPoints: { value: number; date: Date | null; ariaLabel: string }[] = [];
  const completedPoints: { value: number; date: Date | null; ariaLabel: string }[] = [];

  allPoints.forEach(point => {
    const ariaLabel = point.getAttribute('aria-label');
    if (!ariaLabel) return;

    // Format: "Dec 19, 48. Completed." or "Feb 9 2026, 154.5. Open."
    // Value can be decimal (e.g., 154.5), so use [\d.]+ and \.\s+ to distinguish from decimal point
    const valueMatch = ariaLabel.match(/,\s*([\d.]+)\.\s+(Open|Completed|オープン|完了)/i);
    if (!valueMatch) return;

    const value = parseFloat(valueMatch[1]);
    const type = valueMatch[2].toLowerCase();

    const dateMatch = ariaLabel.match(/^([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{4}))?/);
    let date: Date | null = null;
    if (dateMatch) {
      const monthName = dateMatch[1].toLowerCase();
      const day = parseInt(dateMatch[2], 10);
      const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
      const month = MONTH_NAME_TO_NUMBER[monthName];
      if (month !== undefined) {
        date = new Date(year, month, day);
      }
    }

    const pointData = { value, date, ariaLabel };

    if (type === 'completed' || type === '完了') {
      completedPoints.push(pointData);
    } else if (type === 'open' || type === 'オープン') {
      openPoints.push(pointData);
    }
  });

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const findLatestPoint = (points: typeof openPoints) => {
    if (points.length === 0) return null;

    const validPoints = points.filter(p => p.date && p.date <= today);
    if (validPoints.length === 0) {
      return points[points.length - 1];
    }

    validPoints.sort((a, b) => b.date!.getTime() - a.date!.getTime());
    return validPoints[0];
  };

  const latestCompleted = findLatestPoint(completedPoints);
  const latestOpen = findLatestPoint(openPoints);

  if (latestCompleted) {
    result.completed = latestCompleted.value;
  }
  if (latestOpen) {
    result.open = latestOpen.value;
  }

  return result;
}

export function extractFirstPointFromPath(d: string | null): PixelPoint | null {
  if (!d) return null;

  const moveMatch = d.match(/^M\s*([\d.]+)\s*([\d.]+)/i);
  if (moveMatch) {
    return {
      x: parseFloat(moveMatch[1]),
      y: parseFloat(moveMatch[2]),
    };
  }
  return null;
}

export function extractLastPointFromPath(d: string | null, plotBox: PlotBox): PixelPoint | null {
  if (!d) return null;

  const regex = /([MLHVlmhv])\s*([\d.\s,-]*)/g;
  let match;
  let currentX = 0;
  let currentY = 0;
  let lastValidPoint: PixelPoint | null = null;

  while ((match = regex.exec(d)) !== null) {
    const command = match[1];
    const args = match[2].trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

    switch (command) {
      case 'M':
      case 'L':
        for (let i = 0; i < args.length; i += 2) {
          if (i + 1 < args.length) {
            currentX = args[i];
            currentY = args[i + 1];
            if (isPointInPlotBox(currentX, currentY, plotBox)) {
              lastValidPoint = { x: currentX, y: currentY };
            }
          }
        }
        break;
      case 'H':
        for (const arg of args) {
          currentX = arg;
          if (isPointInPlotBox(currentX, currentY, plotBox)) {
            lastValidPoint = { x: currentX, y: currentY };
          }
        }
        break;
      case 'V':
        for (const arg of args) {
          currentY = arg;
          if (isPointInPlotBox(currentX, currentY, plotBox)) {
            lastValidPoint = { x: currentX, y: currentY };
          }
        }
        break;
      case 'm':
      case 'l':
        for (let i = 0; i < args.length; i += 2) {
          if (i + 1 < args.length) {
            currentX += args[i];
            currentY += args[i + 1];
            if (isPointInPlotBox(currentX, currentY, plotBox)) {
              lastValidPoint = { x: currentX, y: currentY };
            }
          }
        }
        break;
      case 'h':
        for (const arg of args) {
          currentX += arg;
          if (isPointInPlotBox(currentX, currentY, plotBox)) {
            lastValidPoint = { x: currentX, y: currentY };
          }
        }
        break;
      case 'v':
        for (const arg of args) {
          currentY += arg;
          if (isPointInPlotBox(currentX, currentY, plotBox)) {
            lastValidPoint = { x: currentX, y: currentY };
          }
        }
        break;
    }
  }

  return lastValidPoint;
}

function isPointInPlotBox(x: number, y: number, plotBox: PlotBox): boolean {
  return x >= plotBox.plotLeft - 1 &&
    x <= plotBox.plotLeft + plotBox.plotWidth + 1 &&
    y >= plotBox.plotTop - 1 &&
    y <= plotBox.plotTop + plotBox.plotHeight + 1;
}

export function parsePathData(
  d: string | null,
  plotBox: PlotBox,
  dateRange: DateRange | null,
  yMin: number,
  yMax: number,
): DataPoint[] {
  if (!d) return [];

  const regex = /([MLCSTQAHVZmlcstqahvz])\s*([^MLCSTQAHVZmlcstqahvz]*)/g;
  let match;
  let currentX = 0;
  let currentY = 0;
  const allPoints: PixelPoint[] = [];

  while ((match = regex.exec(d)) !== null) {
    const command = match[1];
    const args = match[2].trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

    switch (command) {
      case 'M':
      case 'L':
        for (let i = 0; i < args.length; i += 2) {
          if (i + 1 < args.length) {
            currentX = args[i];
            currentY = args[i + 1];
            allPoints.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'm':
      case 'l':
        for (let i = 0; i < args.length; i += 2) {
          if (i + 1 < args.length) {
            currentX += args[i];
            currentY += args[i + 1];
            allPoints.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'H':
        for (const arg of args) {
          currentX = arg;
          allPoints.push({ x: currentX, y: currentY });
        }
        break;
      case 'h':
        for (const arg of args) {
          currentX += arg;
          allPoints.push({ x: currentX, y: currentY });
        }
        break;
      case 'V':
        for (const arg of args) {
          currentY = arg;
          allPoints.push({ x: currentX, y: currentY });
        }
        break;
      case 'v':
        for (const arg of args) {
          currentY += arg;
          allPoints.push({ x: currentX, y: currentY });
        }
        break;
      case 'C':
        for (let i = 0; i < args.length; i += 6) {
          if (i + 5 < args.length) {
            currentX = args[i + 4];
            currentY = args[i + 5];
            allPoints.push({ x: currentX, y: currentY });
          }
        }
        break;
      case 'c':
        for (let i = 0; i < args.length; i += 6) {
          if (i + 5 < args.length) {
            currentX += args[i + 4];
            currentY += args[i + 5];
            allPoints.push({ x: currentX, y: currentY });
          }
        }
        break;
    }
  }

  const filteredPoints = allPoints.filter(p => isPointInPlotBox(p.x, p.y, plotBox));

  if (!dateRange || !dateRange.start || !dateRange.end) {
    return filteredPoints.map(p => ({
      date: new Date(),
      value: pixelToValue(p.y, plotBox.plotTop, plotBox.plotHeight, yMin, yMax),
    }));
  }

  const startTime = dateRange.start.getTime();
  const endTime = dateRange.end.getTime();
  const timeRange = endTime - startTime;

  const dataPoints = filteredPoints.map(p => {
    const xRatio = (p.x - plotBox.plotLeft) / plotBox.plotWidth;
    const date = new Date(startTime + xRatio * timeRange);
    const value = pixelToValue(p.y, plotBox.plotTop, plotBox.plotHeight, yMin, yMax);

    return { date, value };
  });

  dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

  return sampleByDay(dataPoints);
}

function pixelToValue(pixelY: number, plotTop: number, plotHeight: number, yMin: number, yMax: number): number {
  const ratio = (plotTop + plotHeight - pixelY) / plotHeight;
  return yMin + ratio * (yMax - yMin);
}

function sampleByDay(points: DataPoint[]): DataPoint[] {
  if (points.length === 0) return [];

  const sampled: DataPoint[] = [];
  let lastDate: string | null = null;

  for (const point of points) {
    const dateStr = point.date.toISOString().split('T')[0];
    if (dateStr !== lastDate) {
      sampled.push(point);
      lastDate = dateStr;
    }
  }

  return sampled;
}

export function extractDateRangeFromLabels(xDates: { text: string; x: number }[]): DateRange | null {
  if (xDates.length === 0) return null;

  const parseDate = (text: string): { month: number; day: number; year: number | null } | null => {
    const jpMatch = text.match(/(\d{1,2})月\s*(\d{1,2})(?:\s*(\d{4}))?/);
    if (jpMatch) {
      const month = parseInt(jpMatch[1], 10) - 1;
      const day = parseInt(jpMatch[2], 10);
      const year = jpMatch[3] ? parseInt(jpMatch[3], 10) : null;
      return { month, day, year };
    }

    const enMatch = text.match(/([A-Za-z]{3})\s*(\d{1,2})(?:\s*(\d{4}))?/);
    if (enMatch) {
      const monthName = enMatch[1].toLowerCase();
      const month = MONTH_NAME_TO_NUMBER[monthName];
      if (month === undefined) return null;
      const day = parseInt(enMatch[2], 10);
      const year = enMatch[3] ? parseInt(enMatch[3], 10) : null;
      return { month, day, year };
    }

    return null;
  };

  const firstLabel = parseDate(xDates[0].text);
  const lastLabel = parseDate(xDates[xDates.length - 1].text);

  if (!firstLabel || !lastLabel) return null;

  const now = new Date();
  const endYear = lastLabel.year || now.getFullYear();
  let startYear = firstLabel.year || endYear;

  if (firstLabel.month > lastLabel.month && !firstLabel.year) {
    startYear = endYear - 1;
  }

  const start = new Date(startYear, firstLabel.month, firstLabel.day);
  const end = new Date(endYear, lastLabel.month, lastLabel.day);

  return { start, end };
}

export function extractDateRangeFromPage(): DateRange | null {
  const pageText = document.body.innerText;

  const jpDateRangeMatch = pageText.match(/(\d{1,2})月\s*(\d{1,2})\s*-\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);

  if (jpDateRangeMatch) {
    const startMonth = parseInt(jpDateRangeMatch[1], 10) - 1;
    const startDay = parseInt(jpDateRangeMatch[2], 10);
    const endYear = parseInt(jpDateRangeMatch[3], 10);
    const endMonth = parseInt(jpDateRangeMatch[4], 10) - 1;
    const endDay = parseInt(jpDateRangeMatch[5], 10);

    let startYear = endYear;
    if (startMonth > endMonth) {
      startYear = endYear - 1;
    }

    return {
      start: new Date(startYear, startMonth, startDay),
      end: new Date(endYear, endMonth, endDay),
    };
  }

  const enDateRangeMatch = pageText.match(/([A-Za-z]{3})\s*(\d{1,2})(?:,?\s*(\d{4}))?\s*-\s*([A-Za-z]{3})\s*(\d{1,2})(?:,?\s*(\d{4}))?/);

  if (enDateRangeMatch) {
    const startMonthName = enDateRangeMatch[1].toLowerCase();
    const startDay = parseInt(enDateRangeMatch[2], 10);
    const startYearMatch = enDateRangeMatch[3] ? parseInt(enDateRangeMatch[3], 10) : null;
    const endMonthName = enDateRangeMatch[4].toLowerCase();
    const endDay = parseInt(enDateRangeMatch[5], 10);
    const endYearMatch = enDateRangeMatch[6] ? parseInt(enDateRangeMatch[6], 10) : null;

    const startMonth = MONTH_NAME_TO_NUMBER[startMonthName];
    const endMonth = MONTH_NAME_TO_NUMBER[endMonthName];

    if (startMonth === undefined || endMonth === undefined) return null;

    const now = new Date();
    const endYear = endYearMatch || now.getFullYear();
    let startYear = startYearMatch || endYear;

    if (startMonth > endMonth && !startYearMatch) {
      startYear = endYear - 1;
    }

    return {
      start: new Date(startYear, startMonth, startDay),
      end: new Date(endYear, endMonth, endDay),
    };
  }

  return null;
}

const MAX_ATTEMPTS = 20;
const RETRY_INTERVAL_MS = 500;

export function waitAndSend(): void {
  let attempts = 0;

  function sendData(): void {
    const data = extractFromSVG();
    window.dispatchEvent(new CustomEvent('burnup-chart-data', { detail: data }));
  }

  function attempt(): void {
    attempts++;

    const svg = document.querySelector('svg.highcharts-root');
    const hasSeriesGroups = svg && svg.querySelectorAll('.highcharts-series-group .highcharts-series').length > 0;
    const hasColumnPoints = svg && svg.querySelectorAll('.highcharts-series .highcharts-point').length > 0;

    if (hasSeriesGroups || hasColumnPoints) {
      sendData();
    } else if (attempts < MAX_ATTEMPTS) {
      setTimeout(attempt, RETRY_INTERVAL_MS);
    } else {
      sendData();
    }
  }

  attempt();
}
