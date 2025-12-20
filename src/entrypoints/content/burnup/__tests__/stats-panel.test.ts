import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStatsPanel, updatePrediction } from '../stats-panel';
import type { BurnupChartData, VelocityInfo, Prediction } from '../types';

describe('stats-panel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('createStatsPanel', () => {
    it('creates a stats panel with correct structure', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };

      const panel = createStatsPanel(data);

      expect(panel.className).toBe('burnup-predictor-stats');
      expect(panel.querySelector('.burnup-predictor-stats-title')).not.toBeNull();
      expect(panel.querySelector('.burnup-predictor-stats-grid')).not.toBeNull();
    });

    it('displays correct completed, remaining, and total values', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 30,
        total: 100,
        completedData: [],
      };

      const panel = createStatsPanel(data);

      const completedEl = panel.querySelector('.burnup-predictor-stat-value.green');
      const remainingEl = panel.querySelectorAll('.burnup-predictor-stat-value')[1];
      const totalEl = panel.querySelector('.burnup-predictor-stat-value.blue');

      expect(completedEl?.textContent).toBe('30');
      expect(remainingEl?.textContent).toBe('70');
      expect(totalEl?.textContent).toBe('100');
    });

    it('calculates progress percentage correctly', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 75,
        total: 100,
        completedData: [],
      };

      const panel = createStatsPanel(data);

      const progressEl = panel.querySelector('.burnup-predictor-stat-value.orange');
      const progressFill = panel.querySelector('.burnup-predictor-progress-fill') as HTMLElement;

      expect(progressEl?.textContent).toBe('75%');
      expect(progressFill?.style.width).toBe('75%');
    });

    it('handles zero total correctly', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 0,
        total: 0,
        completedData: [],
      };

      const panel = createStatsPanel(data);

      const progressEl = panel.querySelector('.burnup-predictor-stat-value.orange');
      expect(progressEl?.textContent).toBe('0%');
    });

    it('handles completed exceeding total', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 150,
        total: 100,
        completedData: [],
      };

      const panel = createStatsPanel(data);

      const remainingEl = panel.querySelectorAll('.burnup-predictor-stat-value')[1];
      const progressEl = panel.querySelector('.burnup-predictor-stat-value.orange');

      expect(remainingEl?.textContent).toBe('0');
      expect(progressEl?.textContent).toBe('100%');
    });

    it('removes existing panel before creating new one', () => {
      const existingPanel = document.createElement('div');
      existingPanel.className = 'burnup-predictor-stats';
      document.body.appendChild(existingPanel);

      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };

      createStatsPanel(data);

      const panels = document.querySelectorAll('.burnup-predictor-stats');
      expect(panels.length).toBe(1);
    });

    it('appends panel to chart container if available', () => {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'highcharts-container';
      const parent = document.createElement('div');
      parent.appendChild(chartContainer);
      document.body.appendChild(parent);

      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };

      const panel = createStatsPanel(data);

      expect(parent.contains(panel)).toBe(true);
    });

    it('appends panel to main or body if chart container not found', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };

      const panel = createStatsPanel(data);

      expect(document.body.contains(panel)).toBe(true);
    });
  });

  describe('updatePrediction', () => {
    beforeEach(() => {
      // Create a container element
      const container = document.createElement('div');
      container.id = 'burnup-prediction';
      document.body.appendChild(container);
    });

    it('updates prediction container with velocity and prediction data', async () => {
      const velocity: VelocityInfo = {
        current: 5.5,
        ideal: 6.0,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-25'),
        dueDate: new Date('2024-01-30'),
        idealVelocity: 6.0,
        isOnTrack: true,
        daysAhead: 5,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      expect(container?.textContent).toContain('5.50 / Day');
      expect(container?.textContent).toContain('6.00 / Day');
      expect(container?.textContent).toContain('2024-01-25');
      expect(container?.textContent).toContain('2024-01-30');
      expect(container?.textContent).toContain('5 days ahead');
    });

    it('handles null velocity values', async () => {
      const velocity: VelocityInfo = {
        current: null,
        ideal: null,
      };
      const prediction: Prediction = {
        completionDate: null,
        dueDate: null,
        idealVelocity: null,
        isOnTrack: null,
        daysAhead: null,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      expect(container?.textContent).toContain('-');
      expect(container?.textContent).toContain('Cannot calculate');
    });

    it('applies success class when on track', async () => {
      const velocity: VelocityInfo = {
        current: 5.5,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-25'),
        dueDate: new Date('2024-01-30'),
        idealVelocity: 6.0,
        isOnTrack: true,
        daysAhead: 5,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      const valueElements = container?.querySelectorAll('.burnup-predictor-prediction-value.success');
      expect(valueElements?.length).toBeGreaterThan(0);
    });

    it('applies danger class when not on track', async () => {
      const velocity: VelocityInfo = {
        current: 5.5,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-30'),
        dueDate: new Date('2024-01-25'),
        idealVelocity: 6.0,
        isOnTrack: false,
        daysAhead: -5,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      const valueElements = container?.querySelectorAll('.burnup-predictor-prediction-value.danger');
      expect(valueElements?.length).toBeGreaterThan(0);
    });

    it('applies warning class when on track status is null', async () => {
      const velocity: VelocityInfo = {
        current: 5.5,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-25'),
        dueDate: null,
        idealVelocity: null,
        isOnTrack: null,
        daysAhead: null,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      const valueElements = container?.querySelectorAll('.burnup-predictor-prediction-value.warning');
      expect(valueElements?.length).toBeGreaterThan(0);
    });

    it('displays days difference correctly', async () => {
      const velocity: VelocityInfo = {
        current: 5.5,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-25'),
        dueDate: new Date('2024-01-30'),
        idealVelocity: 6.0,
        isOnTrack: true,
        daysAhead: 5,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      expect(container?.textContent).toContain('5 days ahead');
    });

    it('displays "On time" when days ahead is zero', async () => {
      const velocity: VelocityInfo = {
        current: 5.5,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-25'),
        dueDate: new Date('2024-01-25'),
        idealVelocity: 6.0,
        isOnTrack: true,
        daysAhead: 0,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      expect(container?.textContent).toContain('On time');
    });

    it('displays days behind correctly', async () => {
      const velocity: VelocityInfo = {
        current: 5.5,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-30'),
        dueDate: new Date('2024-01-25'),
        idealVelocity: 6.0,
        isOnTrack: false,
        daysAhead: -5,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      expect(container?.textContent).toContain('5 days behind');
    });

    it('does not update if container does not exist', async () => {
      document.body.innerHTML = '';

      const velocity: VelocityInfo = {
        current: 5.5,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-25'),
        dueDate: null,
        idealVelocity: null,
        isOnTrack: null,
        daysAhead: null,
      };

      // Should not throw
      await expect(updatePrediction(velocity, prediction)).resolves.not.toThrow();
    });

    it('formats dates correctly', async () => {
      const velocity: VelocityInfo = {
        current: 5.5,
      };
      const prediction: Prediction = {
        completionDate: new Date('2024-01-05'),
        dueDate: new Date('2024-12-25'),
        idealVelocity: 6.0,
        isOnTrack: true,
        daysAhead: 5,
      };

      await updatePrediction(velocity, prediction);

      const container = document.getElementById('burnup-prediction');
      expect(container?.textContent).toContain('2024-01-05');
      expect(container?.textContent).toContain('2024-12-25');
    });
  });
});
