// Contract tests against real GitHub Insights charts, captured by
// `pnpm fixtures:capture` from the e2e fixture project (see e2e/README.md).
// When GitHub changes its markup, re-capture and fix the readers here.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import velocityHtml from '../../../../fixtures/github-pages/insights-velocity.html?raw';
import burnupHtml from '../../../../fixtures/github-pages/insights-burnup.html?raw';
import { detectChartType, extractFromColumnChart, extractFromSVG, type BurnupChartResult } from '../svg-extractor';

function extractBurnup(): BurnupChartResult {
  const result = extractFromSVG();
  if (result?.chartType !== 'burnup') throw new Error(`expected a burnup result, got ${result?.chartType}`);
  return result;
}

function chartSvg(): Element {
  const svg = document.querySelector('svg.highcharts-root');
  if (!svg) throw new Error('fixture has no Highcharts SVG');
  return svg;
}

describe('velocity chart (real page)', () => {
  beforeEach(() => {
    document.body.innerHTML = velocityHtml;
  });

  it('is detected as a velocity chart', () => {
    expect(detectChartType(chartSvg())).toBe('velocity');
  });

  it('extracts every iteration with its estimate', () => {
    const result = extractFromColumnChart(chartSvg());
    expect(result?.iterations.map(({ name, estimate }) => ({ name, estimate }))).toEqual([
      { name: 'Iteration 1', estimate: 13 },
      { name: 'Iteration 2', estimate: 9 },
      { name: 'Iteration 3', estimate: 9 },
      { name: 'Iteration 4', estimate: 12 },
      { name: 'Iteration 5', estimate: 10 },
      { name: 'Iteration 24', estimate: 9 },
      { name: 'No Iteration', estimate: 0 },
    ]);
  });
});

describe('burnup chart (real page)', () => {
  beforeEach(() => {
    // The chart's custom range is 2026-02-01 to 2027-06-30.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T12:00:00'));
    document.body.innerHTML = burnupHtml;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is detected as a burnup chart', () => {
    expect(detectChartType(chartSvg())).toBe('burnup');
  });

  it('reads the plot area and y-axis range', () => {
    const result = extractBurnup();
    expect(result.chartInfo?.axes.yMin).toBe(0);
    expect(result.chartInfo?.axes.yMax).toBe(70);
    expect(result.chartInfo?.plotBox.plotWidth).toBeGreaterThan(0);
    expect(result.chartInfo?.plotBox.plotHeight).toBeGreaterThan(0);
  });

  // Known bug: x-axis labels carry a year only from the next year on
  // ("Dec 28", "Jan 12 2027"), and the year-less labels are assigned the
  // last label's year, shifting the range to 2027-01-31..2027-06-25. The
  // wrong range also skews the extracted totals. Flip to `it` once fixed.
  it.fails('reads the date range across a year boundary', () => {
    const result = extractBurnup();
    expect(result.dateRange?.start).toEqual(new Date(2026, 1, 1));
    expect(result.dateRange?.end).toEqual(new Date(2027, 5, 30));
  });
});
