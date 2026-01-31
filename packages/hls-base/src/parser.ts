/**
 * Parser wrapper for hls-parser functions
 */

import type { Parser, MainManifest, VariantManifest, Variant, TransferContext } from '@mtngtools/hls-types';
import { parseMainManifest, parseVariantManifest } from '@mtngtools/hls-parser';

/**
 * HlsParser - Wraps hls-parser functions to implement Parser interface
 */
export class HlsParser implements Parser {
  async parseMainManifest(content: string, context: TransferContext): Promise<MainManifest> {
    return parseMainManifest(content, context);
  }

  async parseVariantManifest(
    content: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<VariantManifest> {
    return parseVariantManifest(content, variant, context);
  }
}

