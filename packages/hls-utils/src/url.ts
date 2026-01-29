/**
 * URL manipulation utilities for HLS operations
 */

import { ValidationError } from '@mtngtools/hls-types';

/**
 * Resolve a relative URL against a base URL
 * Essential for resolving variant and chunk paths relative to their manifests
 *
 * @param baseUrl - Base URL (e.g., manifest URL)
 * @param relativeUrl - Relative URL to resolve
 * @returns Resolved absolute URL
 *
 * @example
 * ```ts
 * resolveUrl('https://example.com/path/master.m3u8', 'variant.m3u8')
 * // => 'https://example.com/path/variant.m3u8'
 * ```
 */
export function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new ValidationError(
      `Failed to resolve URL: base="${baseUrl}", relative="${relativeUrl}"`,
      'url',
      { baseUrl, relativeUrl },
      cause,
    );
  }
}

/**
 * Parse and validate a standard HLS URL
 *
 * @param url - URL to parse
 * @returns Parsed URL object or null if invalid
 */
export function parseHlsUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    // Basic validation - could be extended
    if (!parsed.protocol || (!parsed.protocol.startsWith('http') && parsed.protocol !== 'file:')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Extract the base URL (directory) from a full URL
 *
 * @param url - Full URL
 * @returns Base URL (directory containing the file)
 *
 * @example
 * ```ts
 * getBaseUrl('https://example.com/path/file.m3u8')
 * // => 'https://example.com/path/'
 * ```
 */
export function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastSlash = pathname.lastIndexOf('/');
    if (lastSlash === -1) {
      return `${urlObj.origin}/`;
    }
    urlObj.pathname = pathname.slice(0, lastSlash + 1);
    // Clear query and hash to get clean base URL
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.href;
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new ValidationError(
      `Failed to extract base URL from: ${url}`,
      'url',
      { url },
      cause,
    );
  }
}

