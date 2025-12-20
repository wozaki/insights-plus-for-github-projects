import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOpenValueAtEndDate, getCompletedDataPoints } from '../data-processor';
import type { DataPoint } from '../types';

describe('data-processor', () => {
  describe('getOpenValueAtEndDate', () => {
    it('returns null for empty data', () => {
      const result = getOpenValueAtEndDate([], new Date('2024-01-10'));
      expect(result).toBeNull();
    });

    it('returns null for null data', () => {
      const result = getOpenValueAtEndDate(null as any, new Date('2024-01-10'));
      expect(result).toBeNull();
    });

    it('returns the last value before or at end date', () => {
      const openData: DataPoint[] = [
        { date: new Date('2024-01-05'), value: 10 },
        { date: new Date('2024-01-10'), value: 20 },
        { date: new Date('2024-01-15'), value: 30 },
      ];
      const endDate = new Date('2024-01-10');

      const result = getOpenValueAtEndDate(openData, endDate);

      expect(result).toBe(20);
    });

    it('returns the last value when end date is after all data points', () => {
      const openData: DataPoint[] = [
        { date: new Date('2024-01-05'), value: 10 },
        { date: new Date('2024-01-10'), value: 20 },
      ];
      const endDate = new Date('2024-01-20');

      const result = getOpenValueAtEndDate(openData, endDate);

      expect(result).toBe(20);
    });

    it('returns the first value when end date is before all data points', () => {
      const openData: DataPoint[] = [
        { date: new Date('2024-01-10'), value: 20 },
        { date: new Date('2024-01-15'), value: 30 },
      ];
      const endDate = new Date('2024-01-05');

      const result = getOpenValueAtEndDate(openData, endDate);

      // Should return the last value in sorted array (which is the first point)
      expect(result).toBe(30);
    });

    it('handles string dates', () => {
      const openData: DataPoint[] = [
        { date: '2024-01-05', value: 10 },
        { date: '2024-01-10', value: 20 },
      ];
      const endDate = new Date('2024-01-10');

      const result = getOpenValueAtEndDate(openData, endDate);

      expect(result).toBe(20);
    });

    it('filters out invalid dates and values', () => {
      const openData: DataPoint[] = [
        { date: new Date('2024-01-05'), value: 10 },
        { date: new Date('invalid'), value: 20 }, // Invalid date
        { date: new Date('2024-01-10'), value: NaN }, // Invalid value
        { date: new Date('2024-01-15'), value: 30 },
      ];
      const endDate = new Date('2024-01-15');

      const result = getOpenValueAtEndDate(openData, endDate);

      // Should only use valid points: 2024-01-05 (10) and 2024-01-15 (30)
      expect(result).toBe(30);
    });

    it('sorts data points by date', () => {
      const openData: DataPoint[] = [
        { date: new Date('2024-01-15'), value: 30 },
        { date: new Date('2024-01-05'), value: 10 }, // Out of order
        { date: new Date('2024-01-10'), value: 20 },
      ];
      const endDate = new Date('2024-01-10');

      const result = getOpenValueAtEndDate(openData, endDate);

      expect(result).toBe(20);
    });
  });

  describe('getCompletedDataPoints', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns null for empty data', () => {
      const result = getCompletedDataPoints([]);
      expect(result.first).toBeNull();
      expect(result.today).toBeNull();
    });

    it('returns null for null data', () => {
      const result = getCompletedDataPoints(null as any);
      expect(result.first).toBeNull();
      expect(result.today).toBeNull();
    });

    it('returns first and today points correctly', () => {
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-01'), value: 0 },
        { date: new Date('2024-01-10'), value: 10 },
        { date: new Date('2024-01-15'), value: 20 },
      ];

      const result = getCompletedDataPoints(completedData);

      expect(result.first).toEqual({ date: new Date('2024-01-01'), value: 0 });
      expect(result.today).toEqual({ date: new Date('2024-01-15'), value: 20 });
    });

    it('uses latest point before or on today', () => {
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-01'), value: 0 },
        { date: new Date('2024-01-10'), value: 10 },
        { date: new Date('2024-01-20'), value: 30 }, // Future point
      ];

      const result = getCompletedDataPoints(completedData);

      expect(result.first).toEqual({ date: new Date('2024-01-01'), value: 0 });
      // Should use 2024-01-10 (latest point before today)
      expect(result.today).toEqual({ date: new Date('2024-01-10'), value: 10 });
    });

    it('uses first point if no point before today is found', () => {
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-20'), value: 30 }, // Future point
        { date: new Date('2024-01-25'), value: 40 },
      ];

      const result = getCompletedDataPoints(completedData);

      expect(result.first).toEqual({ date: new Date('2024-01-20'), value: 30 });
      // Should use first point if today's point is not found
      expect(result.today).toEqual({ date: new Date('2024-01-20'), value: 30 });
    });

    it('handles string dates', () => {
      const completedData: DataPoint[] = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-01-10', value: 10 },
        { date: '2024-01-15', value: 20 },
      ];

      const result = getCompletedDataPoints(completedData);

      expect(result.first).not.toBeNull();
      expect(result.today).not.toBeNull();
    });

    it('filters out invalid dates and values', () => {
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-01'), value: 0 },
        { date: new Date('invalid'), value: 10 }, // Invalid date
        { date: new Date('2024-01-10'), value: NaN }, // Invalid value
        { date: new Date('2024-01-15'), value: 20 },
      ];

      const result = getCompletedDataPoints(completedData);

      // Should only use valid points: 2024-01-01 (0) and 2024-01-15 (20)
      expect(result.first).toEqual({ date: new Date('2024-01-01'), value: 0 });
      expect(result.today).toEqual({ date: new Date('2024-01-15'), value: 20 });
    });

    it('sorts data points by date', () => {
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-15'), value: 20 },
        { date: new Date('2024-01-01'), value: 0 }, // Out of order
        { date: new Date('2024-01-10'), value: 10 },
      ];

      const result = getCompletedDataPoints(completedData);

      expect(result.first).toEqual({ date: new Date('2024-01-01'), value: 0 });
      expect(result.today).toEqual({ date: new Date('2024-01-15'), value: 20 });
    });
  });
});
