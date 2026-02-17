import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateXAxis, validatePeriod, CONFIG_ERROR_TYPE_XAXIS, CONFIG_ERROR_TYPE_PERIOD } from '../chart-config-validator';

describe('chart-config-validator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateXAxis', () => {
    it('returns null when DatePickerContainer exists (X-axis is Time)', () => {
      const container = document.createElement('div');
      container.className = 'insights-chart-view-module__DatePickerContainer__gdxOG';
      document.body.appendChild(container);

      expect(validateXAxis()).toBeNull();
    });

    it('returns error when DatePickerContainer does not exist (X-axis is not Time)', () => {
      const result = validateXAxis();

      expect(result).not.toBeNull();
      expect(result?.type).toBe(CONFIG_ERROR_TYPE_XAXIS);
    });

    it('matches DatePickerContainer with any CSS module hash suffix', () => {
      const container = document.createElement('div');
      container.className = 'some-prefix__DatePickerContainer__abc123';
      document.body.appendChild(container);

      expect(validateXAxis()).toBeNull();
    });
  });

  describe('validatePeriod', () => {
    it('returns null when xMax is beyond today (Custom range)', () => {
      vi.setSystemTime(new Date('2024-06-15'));

      const tomorrow = new Date('2024-06-16').getTime();
      expect(validatePeriod(tomorrow)).toBeNull();
    });

    it('returns null when xMax is far in the future', () => {
      vi.setSystemTime(new Date('2024-06-15'));

      const futureDate = new Date('2024-09-30').getTime();
      expect(validatePeriod(futureDate)).toBeNull();
    });

    it('returns error when xMax is today (preset period)', () => {
      vi.setSystemTime(new Date('2024-06-15T10:00:00'));

      const todayTimestamp = new Date('2024-06-15T23:59:59').getTime();
      const result = validatePeriod(todayTimestamp);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(CONFIG_ERROR_TYPE_PERIOD);
    });

    it('returns error when xMax is in the past', () => {
      vi.setSystemTime(new Date('2024-06-15'));

      const yesterday = new Date('2024-06-14').getTime();
      const result = validatePeriod(yesterday);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(CONFIG_ERROR_TYPE_PERIOD);
    });

    it('returns error when xMax is today at midnight', () => {
      vi.setSystemTime(new Date('2024-06-15T12:00:00'));

      const todayMidnight = new Date('2024-06-15T00:00:00').getTime();
      const result = validatePeriod(todayMidnight);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(CONFIG_ERROR_TYPE_PERIOD);
    });

    it('compares dates ignoring time-of-day', () => {
      vi.setSystemTime(new Date('2024-06-15T23:59:59'));

      const tomorrowEarly = new Date('2024-06-16T00:00:01').getTime();
      expect(validatePeriod(tomorrowEarly)).toBeNull();
    });
  });
});
