import { describe, it, expect, vi } from 'vitest';
import { calculateVelocity } from '../velocity-calculator';
import type { DataPoint } from '../types';

describe('velocity-calculator', () => {
  const LOOKBACK_DAYS = 21; // Default lookback days for tests

  describe('calculateVelocity', () => {
    it('returns null for empty data', () => {
      const result = calculateVelocity([], new Date('2024-01-01'), 0, LOOKBACK_DAYS);
      expect(result.current).toBeNull();
    });

    it('returns null for null data', () => {
      const result = calculateVelocity(null as any, new Date('2024-01-01'), 0, LOOKBACK_DAYS);
      expect(result.current).toBeNull();
    });

    it('calculates velocity correctly (points per day)', () => {
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-05'), value: 10 },
        { date: new Date('2024-01-10'), value: 20 },
      ];

      const result = calculateVelocity(completedData, startDate, startValue, LOOKBACK_DAYS);

      // Latest point is 2024-01-10 with value 20
      // Total days: 9 days (from 2024-01-01 to 2024-01-10)
      // Total progress: 20 - 0 = 20
      // Velocity per day: 20 / 9 ≈ 2.22
      expect(result.current).toBeCloseTo(20 / 9, 2);
    });

    it('uses latest point before or on today', () => {
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const completedData: DataPoint[] = [
        { date: yesterday, value: 10 },
        { date: tomorrow, value: 30 }, // Future point should be ignored
      ];

      const result = calculateVelocity(completedData, startDate, startValue, LOOKBACK_DAYS);

      // Should use yesterday's point
      const daysDiff = (yesterday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const expectedVelocity = 10 / daysDiff;
      expect(result.current).toBeCloseTo(expectedVelocity, 2);
    });

    it('handles string dates', () => {
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      const completedData: DataPoint[] = [
        { date: '2024-01-05', value: 10 },
        { date: '2024-01-10', value: 20 },
      ];

      const result = calculateVelocity(completedData, startDate, startValue, LOOKBACK_DAYS);
      expect(result.current).toBeCloseTo(20 / 9, 2);
    });

    it('filters out invalid dates and values', () => {
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-05'), value: 10 },
        { date: new Date('invalid'), value: 20 }, // Invalid date
        { date: new Date('2024-01-10'), value: NaN }, // Invalid value
        { date: new Date('2024-01-15'), value: 30 },
      ];

      const result = calculateVelocity(completedData, startDate, startValue, LOOKBACK_DAYS);

      // Should only use valid points: 2024-01-05 (10) and 2024-01-15 (30)
      // Latest valid point: 2024-01-15 with value 30
      // Days: 14 days (from 2024-01-01 to 2024-01-15)
      expect(result.current).toBeCloseTo(30 / 14, 2);
    });

    it('returns null if totalDays is zero or negative', () => {
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-01'), value: 10 }, // Same day as start
      ];

      const result = calculateVelocity(completedData, startDate, startValue, LOOKBACK_DAYS);
      expect(result.current).toBeNull();
    });

    it('returns null if velocity is zero or negative', () => {
      const startDate = new Date('2024-01-01');
      const startValue = 10;
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-10'), value: 5 }, // Decreased value
      ];

      const result = calculateVelocity(completedData, startDate, startValue, LOOKBACK_DAYS);
      expect(result.current).toBeNull();
    });

    it('sorts data points by date', () => {
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-10'), value: 20 },
        { date: new Date('2024-01-05'), value: 10 }, // Out of order
      ];

      const result = calculateVelocity(completedData, startDate, startValue, LOOKBACK_DAYS);

      // Should use the latest point (2024-01-10)
      expect(result.current).toBeCloseTo(20 / 9, 2);
    });

    it('uses lookback days parameter', () => {
      const today = new Date('2024-02-01');
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      
      // Create data points: old data (outside lookback) and recent data (within lookback)
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-05'), value: 10 }, // Old data
        { date: new Date('2024-01-25'), value: 20 }, // Recent data (within 14 days)
        { date: new Date('2024-01-30'), value: 30 }, // Recent data (within 14 days)
      ];

      // Mock today's date for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(today);

      // Test with 14 days lookback
      const result = calculateVelocity(completedData, startDate, startValue, 14);

      // Should use only recent points (2024-01-25 to 2024-01-30)
      // But periodStartValue uses pointBeforePeriod (2024-01-05, value: 10)
      // Days: 5 days (from 2024-01-25 to 2024-01-30)
      // Progress: 30 - 10 = 20 (lastRecentPoint.value - periodStartValue)
      // Velocity per day: 20 / 5 = 4.0
      expect(result.current).toBeCloseTo(4.0, 2);

      // Restore original timers
      vi.useRealTimers();
    });

    it('falls back to all-time average when lookback period has insufficient data', () => {
      const today = new Date('2024-02-01');
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      
      // Only one data point in the lookback period
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-05'), value: 10 }, // Old data (outside 7 days)
        { date: new Date('2024-01-30'), value: 30 }, // Only one point in 7 days lookback
      ];

      // Mock today's date
      vi.useFakeTimers();
      vi.setSystemTime(today);

      // Test with 7 days lookback (only 1 point in period, should fallback)
      const result = calculateVelocity(completedData, startDate, startValue, 7);

      // Should fallback to all-time average
      // Total days: 29 days (from 2024-01-01 to 2024-01-30)
      // Total progress: 30 - 0 = 30
      // Velocity per day: 30 / 29 ≈ 1.03
      expect(result.current).toBeCloseTo(30 / 29, 2);

      // Restore original timers
      vi.useRealTimers();
    });

    it('uses default lookback days (21) when not specified', () => {
      const startDate = new Date('2024-01-01');
      const startValue = 0;
      const completedData: DataPoint[] = [
        { date: new Date('2024-01-05'), value: 10 },
        { date: new Date('2024-01-10'), value: 20 },
      ];

      const result = calculateVelocity(completedData, startDate, startValue);

      // Should work the same as before (defaults to 21 days, but falls back to all-time)
      expect(result.current).not.toBeNull();
    });

    it('handles lookback period starting before project start', () => {
      const today = new Date('2024-02-15');
      const startDate = new Date('2024-02-01'); // Project started recently
      const startValue = 0;
      
      const completedData: DataPoint[] = [
        { date: new Date('2024-02-05'), value: 10 },
        { date: new Date('2024-02-10'), value: 20 },
        { date: new Date('2024-02-14'), value: 30 },
      ];

      // Mock today's date
      vi.useFakeTimers();
      vi.setSystemTime(today);

      // Test with 30 days lookback (period starts before project start)
      const result = calculateVelocity(completedData, startDate, startValue, 30);

      // Since firstRecentPoint.date (2024-02-05) is after startDate (2024-02-01),
      // periodStartDate is firstRecentPoint.date, not startDate
      // Days: 9 days (from 2024-02-05 to 2024-02-14)
      // Progress: 30 - 10 = 20 (lastRecentPoint.value - firstRecentPoint.value)
      // Velocity per day: 20 / 9 ≈ 2.22
      expect(result.current).toBeCloseTo(20 / 9, 2);

      // Restore original timers
      vi.useRealTimers();
    });
  });
});
