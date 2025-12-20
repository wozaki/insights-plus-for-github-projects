import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isProjectInsightsPage } from '../page-detector';

describe('page-detector', () => {
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
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  describe('isProjectInsightsPage', () => {
    it('returns true for orgs project insights page', () => {
      mockLocation('https://github.com/orgs/myorg/projects/123/insights');
      expect(isProjectInsightsPage()).toBe(true);
    });

    it('returns true for users project insights page', () => {
      mockLocation('https://github.com/users/myuser/projects/456/insights');
      expect(isProjectInsightsPage()).toBe(true);
    });

    it('returns true for insights page with query parameters', () => {
      mockLocation('https://github.com/orgs/myorg/projects/123/insights?view=burnup');
      expect(isProjectInsightsPage()).toBe(true);
    });

    it('returns true for insights page with hash', () => {
      mockLocation('https://github.com/users/myuser/projects/456/insights#section');
      expect(isProjectInsightsPage()).toBe(true);
    });

    it('returns false for non-insights project page', () => {
      mockLocation('https://github.com/orgs/myorg/projects/123');
      expect(isProjectInsightsPage()).toBe(false);
    });

    it('returns false for GitHub homepage', () => {
      mockLocation('https://github.com');
      expect(isProjectInsightsPage()).toBe(false);
    });

    it('returns false for repository page', () => {
      mockLocation('https://github.com/orgs/myorg/repo');
      expect(isProjectInsightsPage()).toBe(false);
    });

    it('returns false for different domain', () => {
      mockLocation('https://example.com/orgs/myorg/projects/123/insights');
      expect(isProjectInsightsPage()).toBe(false);
    });
  });
});
