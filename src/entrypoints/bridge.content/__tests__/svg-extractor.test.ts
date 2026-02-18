import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectChartType,
  extractFromColumnChart,
  extractFromSVG,
  extractDateRangeFromLabels,
  type BurnupChartResult,
} from '../svg-extractor';

describe('svg-extractor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28'));
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createBurnupChartSVG(options: {
    completedPoints?: Array<{ date: string; value: number }>;
    openPoints?: Array<{ date: string; value: number }>;
    yMin?: number;
    yMax?: number;
    xLabels?: string[];
  }): SVGSVGElement {
    const {
      completedPoints = [],
      openPoints = [],
      yMin = 0,
      yMax = 100,
      xLabels = ['Jan 1', 'Jan 15', 'Jan 31'],
    } = options;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('highcharts-root');

    const plotBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    plotBackground.classList.add('highcharts-plot-background');
    plotBackground.setAttribute('x', '100');
    plotBackground.setAttribute('y', '50');
    plotBackground.setAttribute('width', '500');
    plotBackground.setAttribute('height', '300');
    svg.appendChild(plotBackground);

    const yAxisLabels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    yAxisLabels.classList.add('highcharts-yaxis-labels');
    [yMin, (yMin + yMax) / 2, yMax].forEach((value, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = String(value);
      text.setAttribute('y', String(50 + 150 - i * 75));
      yAxisLabels.appendChild(text);
    });
    svg.appendChild(yAxisLabels);

    const xAxisLabelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxisLabelsGroup.classList.add('highcharts-xaxis-labels');
    xLabels.forEach((label, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = label;
      text.setAttribute('x', String(100 + i * (500 / (xLabels.length - 1))));
      xAxisLabelsGroup.appendChild(text);
    });
    svg.appendChild(xAxisLabelsGroup);

    const legend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    legend.classList.add('highcharts-legend');

    const completedLegend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    completedLegend.classList.add('highcharts-legend-item');
    completedLegend.textContent = 'Completed';
    legend.appendChild(completedLegend);

    const openLegend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    openLegend.classList.add('highcharts-legend-item');
    openLegend.textContent = 'Open';
    legend.appendChild(openLegend);

    svg.appendChild(legend);

    const seriesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    seriesGroup.classList.add('highcharts-series-group');

    const completedSeries = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    completedSeries.classList.add('highcharts-series');

    const completedArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    completedArea.classList.add('highcharts-area');
    completedArea.setAttribute('d', 'M100 350 L600 200');
    completedArea.setAttribute('fill', '#2da44e');
    completedSeries.appendChild(completedArea);

    completedPoints.forEach(point => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      marker.classList.add('highcharts-point');
      marker.setAttribute('aria-label', `${point.date}, ${point.value}. Completed.`);
      completedSeries.appendChild(marker);
    });

    seriesGroup.appendChild(completedSeries);

    const openSeries = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    openSeries.classList.add('highcharts-series');

    const openArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    openArea.classList.add('highcharts-area');
    openArea.setAttribute('d', 'M100 250 L600 100');
    openArea.setAttribute('fill', '#bf8700');
    openSeries.appendChild(openArea);

    openPoints.forEach(point => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      marker.classList.add('highcharts-point');
      marker.setAttribute('aria-label', `${point.date}, ${point.value}. Open.`);
      openSeries.appendChild(marker);
    });

    seriesGroup.appendChild(openSeries);
    svg.appendChild(seriesGroup);

    return svg;
  }

  describe('extractValuesFromPointMarkers', () => {
    it('parses integer values correctly', () => {
      const svg = createBurnupChartSVG({
        completedPoints: [
          { date: 'Jan 15', value: 20 },
          { date: 'Jan 28', value: 48 },
        ],
        openPoints: [
          { date: 'Jan 15', value: 100 },
          { date: 'Jan 28', value: 118 },
        ],
        yMax: 200,
        xLabels: ['Jan 1 2026', 'Jan 15 2026', 'Jan 31 2026'],
      });
      document.body.appendChild(svg);

      const result = extractFromSVG() as BurnupChartResult;

      expect(result).not.toBeNull();
      expect(result.completed).toBe(48);
      expect(result.total).toBe(118 + 48);
    });

    it('parses decimal values correctly', () => {
      const svg = createBurnupChartSVG({
        completedPoints: [
          { date: 'Jan 15', value: 30.5 },
          { date: 'Jan 28', value: 56.5 },
        ],
        openPoints: [
          { date: 'Jan 15', value: 120.5 },
          { date: 'Jan 28', value: 154.5 },
        ],
        yMax: 300,
        xLabels: ['Jan 1 2026', 'Jan 15 2026', 'Jan 31 2026'],
      });
      document.body.appendChild(svg);

      const result = extractFromSVG() as BurnupChartResult;

      expect(result).not.toBeNull();
      expect(result.completed).toBe(56.5);
      expect(result.total).toBe(154.5 + 56.5);
    });

    it('parses values with year in date', () => {
      const svg = createBurnupChartSVG({
        completedPoints: [
          { date: 'Feb 9 2026', value: 75.25 },
        ],
        openPoints: [
          { date: 'Feb 9 2026', value: 100.75 },
        ],
        yMax: 200,
        xLabels: ['Jan 1 2026', 'Feb 9 2026', 'Feb 28 2026'],
      });
      document.body.appendChild(svg);

      const result = extractFromSVG() as BurnupChartResult;

      expect(result).not.toBeNull();
      expect(result.completed).toBe(75.25);
      expect(result.total).toBe(100.75 + 75.25);
    });

    it('handles Japanese labels (完了/オープン)', () => {
      const svg = createBurnupChartSVG({
        completedPoints: [],
        openPoints: [],
        yMax: 200,
        xLabels: ['Jan 1 2026', 'Jan 31 2026'],
      });

      const seriesGroup = svg.querySelector('.highcharts-series-group');
      const completedSeries = seriesGroup?.querySelector('.highcharts-series');

      if (completedSeries) {
        const jpCompletedMarker = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        jpCompletedMarker.classList.add('highcharts-point');
        jpCompletedMarker.setAttribute('aria-label', 'Jan 28, 45.5. 完了.');
        completedSeries.appendChild(jpCompletedMarker);
      }

      const openSeries = seriesGroup?.querySelectorAll('.highcharts-series')[1];
      if (openSeries) {
        const jpOpenMarker = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        jpOpenMarker.classList.add('highcharts-point');
        jpOpenMarker.setAttribute('aria-label', 'Jan 28, 90.5. オープン.');
        openSeries.appendChild(jpOpenMarker);
      }

      document.body.appendChild(svg);

      const result = extractFromSVG() as BurnupChartResult;

      expect(result).not.toBeNull();
      expect(result.completed).toBe(45.5);
      expect(result.total).toBe(90.5 + 45.5);
    });

    it('uses the latest point before today', () => {
      const svg = createBurnupChartSVG({
        completedPoints: [
          { date: 'Jan 15', value: 30 },
          { date: 'Jan 28', value: 50 },
          { date: 'Feb 15', value: 80 },
        ],
        openPoints: [
          { date: 'Jan 15', value: 100 },
          { date: 'Jan 28', value: 120 },
          { date: 'Feb 15', value: 150 },
        ],
        yMax: 200,
        xLabels: ['Jan 1 2026', 'Jan 28 2026', 'Feb 28 2026'],
      });
      document.body.appendChild(svg);

      const result = extractFromSVG() as BurnupChartResult;

      expect(result).not.toBeNull();
      expect(result.completed).toBe(50);
      expect(result.total).toBe(120 + 50);
    });
  });

  describe('chart type detection', () => {
    it('detects burnup chart from area paths', () => {
      const svg = createBurnupChartSVG({
        completedPoints: [{ date: 'Jan 28', value: 20 }],
        openPoints: [{ date: 'Jan 28', value: 100 }],
        yMax: 150,
        xLabels: ['Jan 1 2026', 'Jan 31 2026'],
      });

      const chartType = detectChartType(svg);
      expect(chartType).toBe('burnup');
    });

    it('returns unknown for empty SVG', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('highcharts-root');

      const chartType = detectChartType(svg);
      expect(chartType).toBe('unknown');
    });
  });

  describe('date range extraction', () => {
    it('extracts date range from x-axis labels (English format)', () => {
      const svg = createBurnupChartSVG({
        completedPoints: [{ date: 'Jan 28', value: 20 }],
        openPoints: [{ date: 'Jan 28', value: 100 }],
        yMax: 150,
        xLabels: ['Jan 1', 'Jan 15', 'Jan 31 2026'],
      });
      document.body.appendChild(svg);

      const result = extractFromSVG() as BurnupChartResult;

      expect(result).not.toBeNull();
      expect(result.dateRange).not.toBeNull();
      if (!result.dateRange) return;
      expect(result.dateRange.start.getMonth()).toBe(0);
      expect(result.dateRange.start.getDate()).toBe(1);
      expect(result.dateRange.end.getMonth()).toBe(0);
      expect(result.dateRange.end.getDate()).toBe(31);
    });
  });

  describe('extractDateRangeFromLabels', () => {
    it('handles Japanese date format', () => {
      const xDates = [
        { text: '12月 1', x: 100 },
        { text: '1月 15 2026', x: 350 },
      ];
      const range = extractDateRangeFromLabels(xDates);

      expect(range).not.toBeNull();
      if (!range) return;
      expect(range.start.getMonth()).toBe(11);
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getMonth()).toBe(0);
      expect(range.end.getDate()).toBe(15);
    });

    it('returns null for empty labels', () => {
      expect(extractDateRangeFromLabels([])).toBeNull();
    });
  });

  describe('extractFromColumnChart (velocity)', () => {
    it('extracts iteration data from column chart', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('highcharts-root');

      const plotBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      plotBackground.classList.add('highcharts-plot-background');
      plotBackground.setAttribute('x', '100');
      plotBackground.setAttribute('y', '50');
      plotBackground.setAttribute('width', '500');
      plotBackground.setAttribute('height', '300');
      svg.appendChild(plotBackground);

      const yAxisLabels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      yAxisLabels.classList.add('highcharts-yaxis-labels');
      [0, 10, 20].forEach((value, i) => {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = String(value);
        text.setAttribute('y', String(350 - i * 150));
        yAxisLabels.appendChild(text);
      });
      svg.appendChild(yAxisLabels);

      const seriesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const series = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      series.classList.add('highcharts-series');

      const points = [
        { label: 'Iteration 1, 10. team-a.', d: 'M120 200 L180 200 L180 350 L120 350 Z' },
        { label: 'Iteration 2, 15. team-a.', d: 'M220 150 L280 150 L280 350 L220 350 Z' },
      ];

      points.forEach(p => {
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        point.classList.add('highcharts-point');
        point.setAttribute('aria-label', p.label);
        point.setAttribute('d', p.d);
        series.appendChild(point);
      });

      seriesGroup.appendChild(series);
      svg.appendChild(seriesGroup);

      const result = extractFromColumnChart(svg);

      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.chartType).toBe('velocity');
      expect(result.iterations).toHaveLength(2);
      expect(result.iterations[0].name).toBe('Iteration 1');
      expect(result.iterations[0].estimate).toBe(10);
      expect(result.iterations[0].groupName).toBe('team-a');
      expect(result.iterations[1].estimate).toBe(15);
    });
  });
});
