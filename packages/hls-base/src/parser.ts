/**
 * Parser wrapper for hls-parser functions
 */

import type { Parser, MasterManifest, VariantManifest, Variant, TransferContext } from '@mtngtools/hls-types';
import { parseMasterManifest, parseVariantManifest } from '@mtngtools/hls-parser';

/**
 * HlsParser - Wraps hls-parser functions to implement Parser interface
 */
export class HlsParser implements Parser {
  async parseMasterManifest(content: string, context: TransferContext): Promise<MasterManifest> {
    return parseMasterManifest(content, context);
  }

  async parseVariantManifest(
    content: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<VariantManifest> {
    return parseVariantManifest(content, variant, context);
  }
}

