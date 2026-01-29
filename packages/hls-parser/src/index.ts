/**
 * @mtngtools/hls-parser
 * HLS manifest parser for master and variant manifests
 */

import type { MasterManifest, VariantManifest, Variant } from '@mtngtools/hls-types';
import type { TransferContext } from '@mtngtools/hls-types';
import { parseMasterManifest as parseMasterManifestImpl } from './master-parser.js';
import { parseVariantManifest as parseVariantManifestImpl } from './variant-parser.js';

/**
 * Parse a master manifest from M3U8 content
 *
 * @param content - M3U8 manifest content
 * @param context - Transfer context
 * @returns Parsed master manifest
 */
export function parseMasterManifest(
  content: string,
  context: TransferContext,
): Promise<MasterManifest> {
  return Promise.resolve(parseMasterManifestImpl(content, context));
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
export { parseMasterManifest as parseMasterManifestSync } from './master-parser.js';
export { parseVariantManifest as parseVariantManifestSync } from './variant-parser.js';
export { tokenize } from './tokenizer.js';
