/**
 * Unit tests for URL utilities
 */

import { describe, it, expect } from 'vitest';
import { resolveUrl } from '@/url.js';
import { ValidationError } from '@mtngtools/utils-hls-types';

describe('resolveUrl', () => {
  it('should resolve relative URL against base URL', () => {
    const result = resolveUrl('https://example.com/path/main.m3u8', 'variant.m3u8');
    expect(result).toBe('https://example.com/path/variant.m3u8');
  });

  it('should resolve absolute URLs', () => {
    const result = resolveUrl('https://example.com/path/main.m3u8', 'https://other.com/variant.m3u8');
    expect(result).toBe('https://other.com/variant.m3u8');
  });

  it('should handle parent directory references', () => {
    const result = resolveUrl('https://example.com/path/main.m3u8', '../other/variant.m3u8');
    expect(result).toBe('https://example.com/other/variant.m3u8');
  });

  it('should handle subdirectories', () => {
    const result = resolveUrl('https://example.com/path/main.m3u8', 'sub/variant.m3u8');
    expect(result).toBe('https://example.com/path/sub/variant.m3u8');
  });

  it('should handle root-relative paths', () => {
    const result = resolveUrl('https://example.com/path/main.m3u8', '/root/variant.m3u8');
    expect(result).toBe('https://example.com/root/variant.m3u8');
  });

  it('should throw ValidationError for invalid base URL', () => {
    expect(() => {
      resolveUrl('not-a-url', 'variant.m3u8');
    }).toThrow(ValidationError);
  });

  it('should join base URL and path when relative is empty', () => {
    const result = resolveUrl('https://example.com/path/main.m3u8', '');
    expect(result).toBe('https://example.com/path/main.m3u8');
  });
});
