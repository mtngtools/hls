/**
 * @mtngtools/hls-parser
 * HLS manifest parser for main and variant manifests
 */

import type { MainManifest, VariantManifest, Variant } from '@mtngtools/hls-types';
import type { TransferContext } from '@mtngtools/hls-types';
import { parseMainManifest as parseMainManifestImpl } from './main-parser.js';
import { parseVariantManifest as parseVariantManifestImpl } from './variant-parser.js';

/**
 * Parse a main manifest from M3U8 content
 *
 * @param content - M3U8 manifest content
 * @param context - Transfer context
 * @returns Parsed main manifest
 */
export function parseMainManifest(
  content: string,
  context: TransferContext,
): Promise<MainManifest> {
  return Promise.resolve(parseMainManifestImpl(content, context));
}

/**
 * Parse a variant manifest from M3U8 content
 *
 * @param content - M3U8 manifest content
 * @param variant - Variant being parsed
 * @param context - Transfer context
 * @returns Parsed variant manifest
 */
export function parseVariantManifest(
  content: string,
  variant: Variant,
  context: TransferContext,
): Promise<VariantManifest> {
  return Promise.resolve(parseVariantManifestImpl(content, variant, context));
}// Re-export parser implementation for direct use if needed
export { parseMainManifest as parseMainManifestSync } from './main-parser.js';
export { parseVariantManifest as parseVariantManifestSync } from './variant-parser.js';
export { tokenize } from './tokenizer.js';
