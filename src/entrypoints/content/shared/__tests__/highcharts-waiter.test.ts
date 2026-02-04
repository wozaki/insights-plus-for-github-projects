import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForHighcharts } from '../highcharts-waiter';

describe('highcharts-waiter', () => {
  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('waitForHighcharts', () => {
    it('resolves to true when Highcharts container is found immediately', async () => {
      const container = document.createElement('div');
      container.className = 'highcharts-container';
      document.body.appendChild(container);

      const promise = waitForHighcharts();
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe(true);
    });

    it('resolves to true when Highcharts container appears after delay', async () => {
      const promise = waitForHighcharts();

      // Initially no container
      expect(document.querySelector('.highcharts-container')).toBeNull();

      // Add container after 1000ms
      setTimeout(() => {
        const container = document.createElement('div');
        container.className = 'highcharts-container';
        document.body.appendChild(container);
      }, 1000);

      await vi.advanceTimersByTimeAsync(1500);
      const result = await promise;

      expect(result).toBe(true);
    });

    it('resolves to false after timeout when container is not found', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = waitForHighcharts();

      // Advance time past timeout (30000ms)
      await vi.advanceTimersByTimeAsync(30000);
      const result = await promise;

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Project Insights] Highcharts not found after timeout'
      );

      consoleWarnSpy.mockRestore();
    });

    it('checks for container at intervals', async () => {
      const querySelectorSpy = vi.spyOn(document, 'querySelector');

      const promise = waitForHighcharts();

      // Advance time by a few intervals (2000ms = 4 intervals of 500ms)
      await vi.advanceTimersByTimeAsync(2000);

      // Should have checked multiple times (every 500ms: 0ms, 500ms, 1000ms, 1500ms, 2000ms = 5 times)
      expect(querySelectorSpy).toHaveBeenCalledTimes(5);
      expect(querySelectorSpy).toHaveBeenCalledWith('.highcharts-container');

      // Add container to resolve the promise without timeout
      const container = document.createElement('div');
      container.className = 'highcharts-container';
      document.body.appendChild(container);

      // Advance time to trigger the check
      await vi.advanceTimersByTimeAsync(500);
      const result = await promise;

      expect(result).toBe(true);
      querySelectorSpy.mockRestore();
    });

    it('stops checking once container is found', async () => {
      const querySelectorSpy = vi.spyOn(document, 'querySelector');

      const promise = waitForHighcharts();

      // Add container after 1000ms
      setTimeout(() => {
        const container = document.createElement('div');
        container.className = 'highcharts-container';
        document.body.appendChild(container);
      }, 1000);

      await vi.advanceTimersByTimeAsync(1500);
      const result = await promise;

      expect(result).toBe(true);

      // Get the number of calls before container was added
      const callsBeforeFound = querySelectorSpy.mock.calls.length;

      // Advance more time - should not check again
      await vi.advanceTimersByTimeAsync(5000);
      const callsAfterFound = querySelectorSpy.mock.calls.length;

      // Should not have increased calls after container was found
      expect(callsAfterFound).toBe(callsBeforeFound);

      querySelectorSpy.mockRestore();
    });
  });
});
