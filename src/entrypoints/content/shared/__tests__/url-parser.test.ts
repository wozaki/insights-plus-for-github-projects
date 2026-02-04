import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseProjectInsightsUrl } from '../url-parser';

describe('url-parser', () => {
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

  describe('parseProjectInsightsUrl', () => {
    describe('orgs URLs', () => {
      it('parses default chart URL (no insight number)', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: 'default',
        });
      });

      it('parses specific insight chart URL', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights/456';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: '456',
        });
      });

      it('parses URL with query parameters', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights?view=burnup';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: 'default',
        });
      });

      it('parses URL with hash', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights#section';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: 'default',
        });
      });

      it('parses URL with insight number and query parameters', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights/456?view=burnup';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: '456',
        });
      });
    });

    describe('users URLs', () => {
      it('parses default chart URL (no insight number)', () => {
        const url = 'https://github.com/users/myuser/projects/456/insights';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'users:myuser',
          projectNumber: '456',
          insightNumber: 'default',
        });
      });

      it('parses specific insight chart URL', () => {
        const url = 'https://github.com/users/myuser/projects/456/insights/789';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'users:myuser',
          projectNumber: '456',
          insightNumber: '789',
        });
      });

      it('parses URL with query parameters', () => {
        const url = 'https://github.com/users/myuser/projects/456/insights?view=velocity';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'users:myuser',
          projectNumber: '456',
          insightNumber: 'default',
        });
      });
    });

    describe('using window.location.href as default', () => {
      it('uses window.location.href when no URL is provided', () => {
        mockLocation('https://github.com/orgs/myorg/projects/123/insights/456');
        const result = parseProjectInsightsUrl();
        
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: '456',
        });
      });
    });

    describe('invalid URLs', () => {
      it('returns null for non-GitHub domain', () => {
        const url = 'https://example.com/orgs/myorg/projects/123/insights';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toBeNull();
      });

      it('returns null for URL with insufficient path parts', () => {
        const url = 'https://github.com/orgs/myorg/projects';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toBeNull();
      });

      it('returns null for URL without projects keyword', () => {
        const url = 'https://github.com/orgs/myorg/repos/123/insights';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toBeNull();
      });

      it('returns null for URL without insights keyword', () => {
        const url = 'https://github.com/orgs/myorg/projects/123';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toBeNull();
      });

      it('returns null for URL with non-numeric project number', () => {
        const url = 'https://github.com/orgs/myorg/projects/abc/insights';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toBeNull();
      });

      it('returns null for URL with non-numeric insight number', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights/abc';
        const result = parseProjectInsightsUrl(url);
        
        // Should still parse, but use "default" for non-numeric insight number
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: 'default',
        });
      });

      it('returns null for invalid URL format', () => {
        const url = 'not-a-valid-url';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalled();
      });

      it('returns null for GitHub homepage', () => {
        const url = 'https://github.com';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toBeNull();
      });

      it('returns null for repository page', () => {
        const url = 'https://github.com/orgs/myorg/repo';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('handles organization names with hyphens', () => {
        const url = 'https://github.com/orgs/my-org-name/projects/123/insights';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'orgs:my-org-name',
          projectNumber: '123',
          insightNumber: 'default',
        });
      });

      it('handles user names with underscores', () => {
        const url = 'https://github.com/users/my_user_name/projects/456/insights/789';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'users:my_user_name',
          projectNumber: '456',
          insightNumber: '789',
        });
      });

      it('handles trailing slash', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights/';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: 'default',
        });
      });

      it('ignores extra path segments after insight number', () => {
        const url = 'https://github.com/orgs/myorg/projects/123/insights/456/extra/path';
        const result = parseProjectInsightsUrl(url);
        
        expect(result).toEqual({
          orgOrUser: 'orgs:myorg',
          projectNumber: '123',
          insightNumber: '456',
        });
      });
    });
  });
});
