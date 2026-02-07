/**
 * URL utilities for HLS pipeline
 */

import { ValidationError } from '@mtngtools/utils-hls-types';

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
 * resolveUrl('https://example.com/path/main.m3u8', 'variant.m3u8')
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
