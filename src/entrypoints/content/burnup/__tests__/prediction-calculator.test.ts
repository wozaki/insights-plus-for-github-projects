import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculatePrediction } from '../prediction-calculator';
import type { BurnupChartData } from '../types';

describe('prediction-calculator', () => {
  beforeEach(() => {
    // Mock Date.now() to have consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculatePrediction', () => {
    it('returns completion date when remaining is zero', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 100,
        total: 100,
        completedData: [],
      };

      const result = calculatePrediction(data, 5, null);

      expect(result.completionDate).toEqual(new Date('2024-01-15'));
      expect(result.dueDate).toBeNull();
      expect(result.idealVelocity).toBe(0);
      expect(result.isOnTrack).toBe(true);
      expect(result.daysAhead).toBeNull();
    });

    it('calculates completion date with current velocity', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };

      const result = calculatePrediction(data, 5, null); // 5 points per day

      // Remaining: 50, Velocity: 5 per day, Days: 10
      const expectedDate = new Date('2024-01-15');
      expectedDate.setDate(expectedDate.getDate() + 10);
      expect(result.completionDate).toEqual(expectedDate);
      expect(result.dueDate).toBeNull();
      expect(result.idealVelocity).toBeNull();
      expect(result.isOnTrack).toBeNull();
      expect(result.daysAhead).toBeNull();
    });

    it('returns null completion date when velocity is null', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };

      const result = calculatePrediction(data, null, null);

      expect(result.completionDate).toBeNull();
      expect(result.dueDate).toBeNull();
      expect(result.idealVelocity).toBeNull();
      expect(result.isOnTrack).toBeNull();
      expect(result.daysAhead).toBeNull();
    });

    it('returns null completion date when velocity is zero', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };

      const result = calculatePrediction(data, 0, null);

      expect(result.completionDate).toBeNull();
    });

    it('calculates ideal velocity when due date is provided', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };
      const dueDate = new Date('2024-01-25'); // 10 days from now

      const result = calculatePrediction(data, 5, dueDate);

      // Remaining: 50, Days until due: 10
      // Ideal velocity per day: 50 / 10 = 5.0
      expect(result.idealVelocity).toBeCloseTo(5.0, 1);
      expect(result.dueDate).toEqual(dueDate);
    });

    it('determines if on track when completion date is before due date', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };
      const dueDate = new Date('2024-01-30'); // 15 days from now

      const result = calculatePrediction(data, 5, dueDate); // Will complete in 10 days (50/5)

      // Velocity is 5 per day, remaining is 50, so 10 days needed
      const expectedDate = new Date('2024-01-15');
      expectedDate.setDate(expectedDate.getDate() + 10);
      expect(result.completionDate).toEqual(expectedDate);
      // Due date is 15 days from now, completion is 10 days from now, so ahead of schedule
      expect(result.isOnTrack).toBe(true);
      expect(result.daysAhead).toBeGreaterThan(0);
    });

    it('determines if not on track when completion date is after due date', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };
      const dueDate = new Date('2024-01-20'); // 5 days from now

      const result = calculatePrediction(data, 5, dueDate); // Will complete in 10 days (50/5)

      // Velocity is 5 per day, remaining is 50, so 10 days needed
      const expectedDate = new Date('2024-01-15');
      expectedDate.setDate(expectedDate.getDate() + 10);
      expect(result.completionDate).toEqual(expectedDate);
      expect(result.isOnTrack).toBe(false);
      // Due date is 5 days from now, completion is 10 days from now, so 5 days behind
      expect(result.daysAhead).toBeLessThan(0);
    });

    it('handles negative remaining (completed exceeds total)', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 150,
        total: 100,
        completedData: [],
      };

      const result = calculatePrediction(data, 5, null);

      // Remaining should be 0 (max(0, 100 - 150) = 0)
      expect(result.completionDate).toEqual(new Date('2024-01-15'));
      expect(result.isOnTrack).toBe(true);
    });

    it('returns null ideal velocity when days until due is zero or negative', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };
      const dueDate = new Date('2024-01-10'); // Past date

      const result = calculatePrediction(data, 5, dueDate);

      // idealVelocity should be null when daysUntilDue <= 0
      expect(result.idealVelocity).toBeNull();
      // But isOnTrack and daysAhead are still calculated if completionDate exists
      expect(result.completionDate).not.toBeNull();
      expect(result.isOnTrack).toBe(false);
      expect(result.daysAhead).toBeLessThan(0);
    });

    it('calculates days ahead correctly when on track', () => {
      const data: BurnupChartData = {
        chartType: 'burnup',
        completed: 50,
        total: 100,
        completedData: [],
      };
      const dueDate = new Date('2024-01-26'); // 11 days from now

      const result = calculatePrediction(data, 5, dueDate); // Completes in 10 days (50/5)

      // Due date is 11 days from now, completion is 10 days from now
      expect(result.daysAhead).toBeGreaterThan(0);
      expect(result.isOnTrack).toBe(true);
    });
  });
});
