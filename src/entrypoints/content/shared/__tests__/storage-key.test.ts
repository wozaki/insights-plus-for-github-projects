import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  generateStorageKey, 
  matchesStorageKey,
  STORAGE_KEY_BURNUP_LOOKBACK_DAYS,
  STORAGE_KEY_BURNUP_TARGET_DATE,
  STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS,
} from '../storage-key';

describe('storage-key', () => {
  const originalLocation = window.location;

  // Helper function to mock window.location
  function mockLocation(href: string) {
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        href,
      },
      writable: true,
      configurable: true,
    });
  }

  beforeEach(() => {
    // Reset location mock before each test
    delete (window as any).location;
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('generateStorageKey', () => {
    describe('with orgs URLs', () => {
      it('generates key for default chart (no insight number)', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS, url);
        
        expect(result).toBe('burnup-lookbackDays:orgs:myorg:123:default');
      });

      it('generates key for specific insight chart', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights/456';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS, url);
        
        expect(result).toBe('burnup-lookbackDays:orgs:myorg:123:456');
      });

      it('generates key for target date', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights/456';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE, url);
        
        expect(result).toBe('burnup-targetDate:orgs:myorg:123:456');
      });

      it('generates key for selected iterations', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights';
        const result = generateStorageKey(STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS, url);
        
        expect(result).toBe('velocity-SelectedIterations:orgs:myorg:123:default');
      });
    });

    describe('with users URLs', () => {
      it('generates key for default chart (no insight number)', () => {
        const url = 'https://github.com/users/myuser/projects/456/insights';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS, url);
        
        expect(result).toBe('burnup-lookbackDays:users:myuser:456:default');
      });

      it('generates key for specific insight chart', () => {
        const url = 'https://github.com/users/myuser/projects/456/insights/789';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE, url);
        
        expect(result).toBe('burnup-targetDate:users:myuser:456:789');
      });
    });

    describe('with invalid URLs', () => {
      it('returns base key when URL parsing fails', () => {
        const url = 'https://example.com/orgs/myorg/projects/123/insights';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS, url);
        
        expect(result).toBe('burnup-lookbackDays');
      });

      it('returns base key for invalid URL format', () => {
        const url = 'not-a-valid-url';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE, url);
        
        expect(result).toBe('burnup-targetDate');
      });

      it('returns base key for GitHub homepage', () => {
        const url = 'https://github.com';
        const result = generateStorageKey(STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS, url);
        
        expect(result).toBe('velocity-SelectedIterations');
      });
    });

    describe('using window.location.href as default', () => {
      it('uses window.location.href when no URL is provided', () => {
        mockLocation('https://github.com/orgs/myorg/projects/123/insights/456');
        const result = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS);
        
        expect(result).toBe('burnup-lookbackDays:orgs:myorg:123:456');
      });

      it('falls back to base key when window.location.href is invalid', () => {
        mockLocation('https://github.com');
        const result = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE);
        
        expect(result).toBe('burnup-targetDate');
      });
    });

    describe('edge cases', () => {
      it('handles organization names with hyphens', () => {
        const url = 'https://github.com/orgs/my-org-name/projects/123/insights/456';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS, url);
        
        expect(result).toBe('burnup-lookbackDays:orgs:my-org-name:123:456');
      });

      it('handles user names with underscores', () => {
        const url = 'https://github.com/users/my_user_name/projects/456/insights';
        const result = generateStorageKey(STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS, url);
        
        expect(result).toBe('velocity-SelectedIterations:users:my_user_name:456:default');
      });

      it('handles large project and insight numbers', () => {
        const url = 'https://github.com/orgs/myorg/projects/999999/insights/888888';
        const result = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE, url);
        
        expect(result).toBe('burnup-targetDate:orgs:myorg:999999:888888');
      });
    });
  });

  describe('matchesStorageKey', () => {
    describe('exact match (backward compatibility)', () => {
      it('matches exact base key for lookbackDays', () => {
        expect(matchesStorageKey('burnup-lookbackDays', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(true);
      });

      it('matches exact base key for targetDate', () => {
        expect(matchesStorageKey('burnup-targetDate', STORAGE_KEY_BURNUP_TARGET_DATE)).toBe(true);
      });

      it('matches exact base key for selectedIterations', () => {
        expect(matchesStorageKey('velocity-SelectedIterations', STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS)).toBe(true);
      });
    });

    describe('pattern match with orgs', () => {
      it('matches URL-based key for lookbackDays', () => {
        expect(matchesStorageKey('burnup-lookbackDays:orgs:myorg:123:456', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(true);
      });

      it('matches URL-based key for targetDate', () => {
        expect(matchesStorageKey('burnup-targetDate:orgs:myorg:123:default', STORAGE_KEY_BURNUP_TARGET_DATE)).toBe(true);
      });

      it('matches URL-based key for selectedIterations', () => {
        expect(matchesStorageKey('velocity-SelectedIterations:orgs:myorg:123:456', STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS)).toBe(true);
      });

      it('matches URL-based key with default insight number', () => {
        expect(matchesStorageKey('burnup-lookbackDays:orgs:myorg:123:default', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(true);
      });
    });

    describe('pattern match with users', () => {
      it('matches URL-based key for lookbackDays', () => {
        expect(matchesStorageKey('burnup-lookbackDays:users:myuser:456:789', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(true);
      });

      it('matches URL-based key for targetDate', () => {
        expect(matchesStorageKey('burnup-targetDate:users:myuser:456:default', STORAGE_KEY_BURNUP_TARGET_DATE)).toBe(true);
      });

      it('matches URL-based key for selectedIterations', () => {
        expect(matchesStorageKey('velocity-SelectedIterations:users:myuser:456:789', STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS)).toBe(true);
      });
    });

    describe('non-matching keys', () => {
      it('does not match different base key', () => {
        expect(matchesStorageKey('burnup-lookbackDays:orgs:myorg:123:456', STORAGE_KEY_BURNUP_TARGET_DATE)).toBe(false);
      });

      it('does not match unrelated key', () => {
        expect(matchesStorageKey('someOtherKey', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(false);
      });

      it('does not match key with similar prefix', () => {
        expect(matchesStorageKey('burnup-lookbackDaysExtra:orgs:myorg:123:456', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(false);
      });

      it('does not match key without colon separator', () => {
        expect(matchesStorageKey('burnup-lookbackDaysorgs:myorg:123:456', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(false);
      });

      it('does not match key with invalid prefix', () => {
        expect(matchesStorageKey('burnup-lookbackDays:invalid:myorg:123:456', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(false);
      });

      it('does not match empty string', () => {
        expect(matchesStorageKey('', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('handles organization names with hyphens', () => {
        expect(matchesStorageKey('burnup-lookbackDays:orgs:my-org-name:123:456', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(true);
      });

      it('handles user names with underscores', () => {
        expect(matchesStorageKey('burnup-targetDate:users:my_user_name:456:789', STORAGE_KEY_BURNUP_TARGET_DATE)).toBe(true);
      });

      it('handles large project and insight numbers', () => {
        expect(matchesStorageKey('burnup-lookbackDays:orgs:myorg:999999:888888', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(true);
      });

      it('handles key with extra segments after insight number', () => {
        // This should still match because we only check the prefix pattern
        expect(matchesStorageKey('burnup-lookbackDays:orgs:myorg:123:456:extra:segments', STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(true);
      });
    });

    describe('integration with generateStorageKey', () => {
      it('matches key generated by generateStorageKey for orgs', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights/456';
        const generatedKey = generateStorageKey(STORAGE_KEY_BURNUP_LOOKBACK_DAYS, url);
        
        expect(matchesStorageKey(generatedKey, STORAGE_KEY_BURNUP_LOOKBACK_DAYS)).toBe(true);
      });

      it('matches key generated by generateStorageKey for users', () => {
        const url = 'https://github.com/users/myuser/projects/456/insights';
        const generatedKey = generateStorageKey(STORAGE_KEY_BURNUP_TARGET_DATE, url);
        
        expect(matchesStorageKey(generatedKey, STORAGE_KEY_BURNUP_TARGET_DATE)).toBe(true);
      });

      it('matches key generated by generateStorageKey with default insight', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights';
        const generatedKey = generateStorageKey(STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS, url);
        
        expect(matchesStorageKey(generatedKey, STORAGE_KEY_VELOCITY_SELECTED_ITERATIONS)).toBe(true);
      });
    });
  });
});
