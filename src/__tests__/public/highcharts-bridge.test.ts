import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('highcharts-bridge', () => {
  let dom: JSDOM;
  let window: Window & typeof globalThis;
  let document: Document;

  // Load the bridge script
  const bridgeScriptPath = resolve(__dirname, '../../public/highcharts-bridge.js');
  const bridgeScript = readFileSync(bridgeScriptPath, 'utf-8');

  const fakeNow = new Date('2026-01-28T00:00:00').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28'));
    
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'dangerously',
      url: 'https://github.com/test/project/insights/burnup',
    });
    window = dom.window as unknown as Window & typeof globalThis;
    document = window.document;

    // vi.useFakeTimers() / vi.setSystemTime() only fakes Date in the Vitest (Node.js) context.
    // JSDOM has its own Date, so new Date() inside highcharts-bridge.js
    // (executed via runScripts: 'dangerously') returns the real system time.
    // Without this override, test results would vary depending on the actual date,
    // so we override Date inside JSDOM to return the same faked time.
    const overrideScript = document.createElement('script');
    overrideScript.textContent = `
      (function() {
        var OrigDate = Date;
        var fakeNow = ${fakeNow};
        function FakeDate(...args) {
          if (args.length === 0) return new OrigDate(fakeNow);
          if (new.target) return new OrigDate(...args);
          return new OrigDate(fakeNow).toString();
        }
        FakeDate.prototype = OrigDate.prototype;
        FakeDate.now = function() { return fakeNow; };
        FakeDate.parse = OrigDate.parse;
        FakeDate.UTC = OrigDate.UTC;
        window.Date = FakeDate;
      })();
    `;
    document.head.appendChild(overrideScript);
  });

  afterEach(() => {
    vi.useRealTimers();
    dom.window.close();
  });

  /**
   * Create a minimal burnup chart SVG structure for testing
   */
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

    // Plot background
    const plotBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    plotBackground.classList.add('highcharts-plot-background');
    plotBackground.setAttribute('x', '100');
    plotBackground.setAttribute('y', '50');
    plotBackground.setAttribute('width', '500');
    plotBackground.setAttribute('height', '300');
    svg.appendChild(plotBackground);

    // Y-axis labels
    const yAxisLabels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    yAxisLabels.classList.add('highcharts-yaxis-labels');
    [yMin, (yMin + yMax) / 2, yMax].forEach((value, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = String(value);
      text.setAttribute('y', String(50 + 150 - i * 75));
      yAxisLabels.appendChild(text);
    });
    svg.appendChild(yAxisLabels);

    // X-axis labels
    const xAxisLabelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxisLabelsGroup.classList.add('highcharts-xaxis-labels');
    xLabels.forEach((label, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = label;
      text.setAttribute('x', String(100 + i * (500 / (xLabels.length - 1))));
      xAxisLabelsGroup.appendChild(text);
    });
    svg.appendChild(xAxisLabelsGroup);

    // Legend
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

    // Series group
    const seriesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    seriesGroup.classList.add('highcharts-series-group');

    // Completed series
    const completedSeries = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    completedSeries.classList.add('highcharts-series');
    
    const completedArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    completedArea.classList.add('highcharts-area');
    completedArea.setAttribute('d', 'M100 350 L600 200');
    completedArea.setAttribute('fill', '#2da44e');
    completedSeries.appendChild(completedArea);

    // Add completed point markers
    completedPoints.forEach(point => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      marker.classList.add('highcharts-point');
      marker.setAttribute('aria-label', `${point.date}, ${point.value}. Completed.`);
      completedSeries.appendChild(marker);
    });

    seriesGroup.appendChild(completedSeries);

    // Open series
    const openSeries = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    openSeries.classList.add('highcharts-series');
    
    const openArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    openArea.classList.add('highcharts-area');
    openArea.setAttribute('d', 'M100 250 L600 100');
    openArea.setAttribute('fill', '#bf8700');
    openSeries.appendChild(openArea);

    // Add open point markers
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

  /**
   * Execute the bridge script and wait for the result
   */
  async function executeBridgeScript(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for burnup-chart-data event'));
      }, 15000);

      window.addEventListener('burnup-chart-data', (e: Event) => {
        clearTimeout(timeout);
        resolve((e as CustomEvent).detail);
      }, { once: true });

      // Execute the script
      const scriptEl = document.createElement('script');
      scriptEl.textContent = bridgeScript;
      document.head.appendChild(scriptEl);

      // Advance timers to trigger the script
      vi.advanceTimersByTime(2000);
    });
  }

  describe('extractValuesFromPointMarkers', () => {
    it('parses integer values correctly', async () => {
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

      const result = await executeBridgeScript() as { completed: number; total: number };

      expect(result).not.toBeNull();
      expect(result.completed).toBe(48);
      // Total = Open + Completed
      expect(result.total).toBe(118 + 48);
    });

    it('parses decimal values correctly', async () => {
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

      const result = await executeBridgeScript() as { completed: number; total: number };

      expect(result).not.toBeNull();
      expect(result.completed).toBe(56.5);
      // Total = Open + Completed
      expect(result.total).toBe(154.5 + 56.5);
    });

    it('parses values with year in date', async () => {
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

      const result = await executeBridgeScript() as { completed: number; total: number };

      expect(result).not.toBeNull();
      expect(result.completed).toBe(75.25);
      expect(result.total).toBe(100.75 + 75.25);
    });

    it('handles Japanese labels (完了/オープン)', async () => {
      const svg = createBurnupChartSVG({
        completedPoints: [],
        openPoints: [],
        yMax: 200,
        xLabels: ['Jan 1 2026', 'Jan 31 2026'],
      });

      // Add Japanese-labeled points manually
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

      const result = await executeBridgeScript() as { completed: number; total: number };

      expect(result).not.toBeNull();
      expect(result.completed).toBe(45.5);
      expect(result.total).toBe(90.5 + 45.5);
    });

    it('uses the latest point before today', async () => {
      // Today is set to 2026-01-28 (faked in both Vitest and JSDOM)
      const svg = createBurnupChartSVG({
        completedPoints: [
          { date: 'Jan 15', value: 30 },
          { date: 'Jan 28', value: 50 },  // Today
          { date: 'Feb 15', value: 80 },  // Future
        ],
        openPoints: [
          { date: 'Jan 15', value: 100 },
          { date: 'Jan 28', value: 120 }, // Today
          { date: 'Feb 15', value: 150 }, // Future
        ],
        yMax: 200,
        xLabels: ['Jan 1 2026', 'Jan 28 2026', 'Feb 28 2026'],
      });
      document.body.appendChild(svg);

      const result = await executeBridgeScript() as { completed: number; total: number };

      expect(result).not.toBeNull();
      // Should use Jan 28 values, not Feb 15 (future)
      expect(result.completed).toBe(50);
      expect(result.total).toBe(120 + 50);
    });
  });

  describe('chart type detection', () => {
    it('detects burnup chart from area paths', async () => {
      const svg = createBurnupChartSVG({
        completedPoints: [{ date: 'Jan 28', value: 20 }],
        openPoints: [{ date: 'Jan 28', value: 100 }],
        yMax: 150,
        xLabels: ['Jan 1 2026', 'Jan 31 2026'],
      });
      document.body.appendChild(svg);

      const result = await executeBridgeScript() as { chartType: string };

      expect(result).not.toBeNull();
      expect(result.chartType).toBe('burnup');
    });
  });

  describe('date range extraction', () => {
    it('extracts date range from x-axis labels (English format)', async () => {
      const svg = createBurnupChartSVG({
        completedPoints: [{ date: 'Jan 28', value: 20 }],
        openPoints: [{ date: 'Jan 28', value: 100 }],
        yMax: 150,
        xLabels: ['Jan 1', 'Jan 15', 'Jan 31 2026'],
      });
      document.body.appendChild(svg);

      const result = await executeBridgeScript() as { 
        dateRange: { start: Date; end: Date } 
      };

      expect(result).not.toBeNull();
      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange.start.getMonth()).toBe(0); // January
      expect(result.dateRange.start.getDate()).toBe(1);
      expect(result.dateRange.end.getMonth()).toBe(0); // January
      expect(result.dateRange.end.getDate()).toBe(31);
    });
  });
});
