// Contract tests against real GitHub Insights charts, captured by
// `pnpm fixtures:capture` from the e2e fixture project (see e2e/README.md).

import { describe, it, expect } from 'vitest';
import velocityHtml from '../../../../../fixtures/github-pages/insights-velocity.html?raw';
import burnupHtml from '../../../../../fixtures/github-pages/insights-burnup.html?raw';
import burnupIterationAxisHtml from '../../../../../fixtures/github-pages/insights-burnup-iteration-axis.html?raw';
import { detectChartType } from '../chart-type-detector';
import { validateXAxis, CONFIG_ERROR_TYPE_XAXIS } from '../../burnup/chart-config-validator';

describe('chart type and x-axis checks on real pages', () => {
  it('detects a velocity chart', () => {
    document.body.innerHTML = velocityHtml;
    expect(detectChartType()).toBe('velocity');
  });

  it('detects a burnup chart with a time x-axis and accepts its x-axis', () => {
    document.body.innerHTML = burnupHtml;
    expect(detectChartType()).toBe('burnup');
    expect(validateXAxis()).toBeNull();
  });

  it('detects a stacked-area chart over iterations as burnup and rejects its x-axis', () => {
    document.body.innerHTML = burnupIterationAxisHtml;
    expect(detectChartType()).toBe('burnup');
    expect(validateXAxis()?.type).toBe(CONFIG_ERROR_TYPE_XAXIS);
  });
});
