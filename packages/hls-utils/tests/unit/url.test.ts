/**
 * Unit tests for URL utilities
 */

import { describe, it, expect } from 'vitest';
import { resolveUrl, parseHlsUrl, getBaseUrl } from '../../src/url.js';
import { ValidationError } from '@mtngtools/hls-types';

describe('resolveUrl', () => {
  it('should resolve relative URL against base URL', () => {
    const result = resolveUrl('https://example.com/path/master.m3u8', 'variant.m3u8');
    expect(result).toBe('https://example.com/path/variant.m3u8');
  });

  it('should resolve absolute URL (returns as-is)', () => {
    const result = resolveUrl('https://example.com/path/master.m3u8', 'https://other.com/variant.m3u8');
    expect(result).toBe('https://other.com/variant.m3u8');
  });

  it('should resolve relative path with parent directory', () => {
    const result = resolveUrl('https://example.com/path/master.m3u8', '../other/variant.m3u8');
    expect(result).toBe('https://example.com/other/variant.m3u8');
  });

  it('should resolve relative path with subdirectory', () => {
    const result = resolveUrl('https://example.com/path/master.m3u8', 'sub/variant.m3u8');
    expect(result).toBe('https://example.com/path/sub/variant.m3u8');
  });

  it('should handle root-relative paths', () => {
    const result = resolveUrl('https://example.com/path/master.m3u8', '/root/variant.m3u8');
    expect(result).toBe('https://example.com/root/variant.m3u8');
  });

  it('should throw ValidationError for invalid base URL', () => {
    expect(() => {
      resolveUrl('not-a-url', 'variant.m3u8');
    }).toThrow(ValidationError);
  });

  it('should resolve empty string as base URL', () => {
    const result = resolveUrl('https://example.com/path/master.m3u8', '');
    expect(result).toBe('https://example.com/path/master.m3u8');
  });
});

describe('parseHlsUrl', () => {
  it('should parse valid HTTP URL', () => {
    const result = parseHlsUrl('https://example.com/path/master.m3u8');
    expect(result).not.toBeNull();
    expect(result?.href).toBe('https://example.com/path/master.m3u8');
    expect(result?.protocol).toBe('https:');
  });

  it('should parse valid HTTP URL', () => {
    const result = parseHlsUrl('http://example.com/path/master.m3u8');
    expect(result).not.toBeNull();
    expect(result?.href).toBe('http://example.com/path/master.m3u8');
    expect(result?.protocol).toBe('http:');
  });

  it('should parse file URL', () => {
    const result = parseHlsUrl('file:///path/to/master.m3u8');
    expect(result).not.toBeNull();
    expect(result?.protocol).toBe('file:');
  });

  it('should return null for invalid URL', () => {
    const result = parseHlsUrl('not-a-url');
    expect(result).toBeNull();
  });

  it('should return null for non-HTTP/file protocols', () => {
    const result = parseHlsUrl('ftp://example.com/file.m3u8');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = parseHlsUrl('');
    expect(result).toBeNull();
  });
});

describe('getBaseUrl', () => {
  it('should extract base URL from file path', () => {
    const result = getBaseUrl('https://example.com/path/file.m3u8');
    expect(result).toBe('https://example.com/path/');
  });

  it('should handle root path', () => {
    const result = getBaseUrl('https://example.com/file.m3u8');
    expect(result).toBe('https://example.com/');
  });

  it('should handle nested paths', () => {
    const result = getBaseUrl('https://example.com/path/to/nested/file.m3u8');
    expect(result).toBe('https://example.com/path/to/nested/');
  });

  it('should handle path without trailing slash', () => {
    const result = getBaseUrl('https://example.com/path');
    expect(result).toBe('https://example.com/');
  });

  it('should preserve query parameters and hash', () => {
    const result = getBaseUrl('https://example.com/path/file.m3u8?param=value#hash');
    expect(result).toBe('https://example.com/path/');
  });

  it('should throw ValidationError for invalid URL', () => {
    expect(() => {
      getBaseUrl('not-a-url');
    }).toThrow(ValidationError);
  });
});
