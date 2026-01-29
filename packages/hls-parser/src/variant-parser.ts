/**
 * Variant manifest parser
 */

import type {
  VariantManifest,
  Chunk,
  Variant,
  EncryptionKey,
  MediaInitialization,
} from '@mtngtools/hls-types';
import type { TransferContext } from '@mtngtools/hls-types';
import { tokenize, extractTagName, extractTagValue } from './tokenizer.js';
import { parseAttributes, parseByteRange } from '@mtngtools/hls-utils';

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
  _variant: Variant,
  _context: TransferContext,
): VariantManifest {
  const tokens = tokenize(content);
  const manifest: VariantManifest = {
    targetDuration: 0,
    chunks: [],
    sourceContent: content,
  };

  let currentChunk: Partial<Chunk> | null = null;
  let currentKey: EncryptionKey | null = null;
  let currentMap: MediaInitialization | null = null;
  let byteRangeOffset = 0;
  let hasDiscontinuity = false;

  for (const token of tokens) {
    if (token.type !== 'TAG' && token.type !== 'URI') {
      continue;
    }

    const tagName = token.type === 'TAG' ? extractTagName(token.value) : null;
    const tagValue = token.type === 'TAG' ? extractTagValue(token.value) : '';

    if (token.type === 'TAG') {
      switch (tagName) {
        case 'EXTM3U':
          // Playlist header - no action needed
          break;

        case 'EXT-X-VERSION':
          manifest.version = Number.parseInt(tagValue, 10);
          break;

        case 'EXT-X-TARGETDURATION':
          manifest.targetDuration = Number.parseInt(tagValue, 10);
          break;

        case 'EXT-X-MEDIA-SEQUENCE':
          manifest.mediaSequence = Number.parseInt(tagValue, 10);
          break;

        case 'EXT-X-DISCONTINUITY-SEQUENCE':
          manifest.discontinuitySequence = Number.parseInt(tagValue, 10);
          break;

        case 'EXT-X-PLAYLIST-TYPE':
          if (tagValue === 'VOD' || tagValue === 'EVENT') {
            manifest.playlistType = tagValue;
          }
          break;

        case 'EXT-X-ENDLIST':
          manifest.endList = true;
          break;

        case 'EXT-X-KEY': {
          const attrs = parseAttributes(tagValue);
          currentKey = {
            method: attrs['METHOD'] || 'NONE',
          };

          if (attrs['URI']) {
            currentKey.uri = attrs['URI'];
          }

          if (attrs['IV']) {
            currentKey.iv = attrs['IV'];
          }

          if (attrs['KEYFORMAT']) {
            currentKey.keyFormat = attrs['KEYFORMAT'];
          }

          if (attrs['KEYFORMATVERSIONS']) {
            currentKey.keyFormatVersions = attrs['KEYFORMATVERSIONS'];
          }

          break;
        }

        case 'EXT-X-MAP': {
          const attrs = parseAttributes(tagValue);
          currentMap = {
            uri: attrs['URI'] || '',
          };

          if (attrs['BYTERANGE']) {
            const byteRange = parseByteRange(attrs['BYTERANGE']!);
            if (byteRange) {
              currentMap.byteRange = byteRange;
            }
          }

          break;
        }

        case 'EXT-X-BYTERANGE': {
          const byteRange = parseByteRange(tagValue);
          if (byteRange && currentChunk) {
            if (byteRange.offset !== undefined) {
              currentChunk.byteRange = byteRange;
              byteRangeOffset = byteRange.offset + byteRange.length;
            } else {
              currentChunk.byteRange = {
                length: byteRange.length,
                offset: byteRangeOffset,
              };
              byteRangeOffset += byteRange.length;
            }
          }
          break;
        }

        case 'EXT-X-DISCONTINUITY':
          // Mark that the next chunk should have discontinuity flag
          hasDiscontinuity = true;
          break;

        case 'EXT-X-PROGRAM-DATE-TIME': {
          if (currentChunk) {
            try {
              currentChunk.programDateTime = new Date(tagValue);
            } catch {
              // Invalid date, skip
            }
          }
          break;
        }

        case 'EXTINF': {
          // Start a new chunk
          const parts = tagValue.split(',');
          const duration = Number.parseFloat(parts[0] || '0');
          const title = parts.slice(1).join(',') || undefined;

          currentChunk = {
            duration,
            title,
          };

          // Apply discontinuity flag if set
          if (hasDiscontinuity) {
            currentChunk.discontinuity = true;
            hasDiscontinuity = false;
          }

          // Apply current key and map if available
          if (currentKey) {
            currentChunk.key = { ...currentKey };
          }

          if (currentMap) {
            currentChunk.map = { ...currentMap };
          }

          break;
        }
      }
    } else if (token.type === 'URI' && currentChunk) {
      // URI line after EXTINF
      currentChunk.uri = token.value;
      manifest.chunks.push(currentChunk as Chunk);
      currentChunk = null;
    }
  }

  return manifest;
}

