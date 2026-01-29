/**
 * Master manifest parser
 */

import type {
  MasterManifest,
  Variant,
  SessionData,
  SessionKey,
} from '@mtngtools/hls-types';
import type { TransferContext } from '@mtngtools/hls-types';
import { tokenize, extractTagName, extractTagValue } from './tokenizer.js';
import { parseAttributes, parseResolution } from '@mtngtools/hls-utils';

/**
 * Parse a master manifest from M3U8 content
 *
 * @param content - M3U8 manifest content
 * @param context - Transfer context
 * @returns Parsed master manifest
 */
export function parseMasterManifest(
  content: string,
  _context: TransferContext,
): MasterManifest {
  const tokens = tokenize(content);
  const manifest: MasterManifest = {
    variants: [],
  };

  let currentVariant: Partial<Variant> | null = null;

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

        case 'EXT-X-INDEPENDENT-SEGMENTS':
          manifest.independentSegments = true;
          break;

        case 'EXT-X-START': {
          const attrs = parseAttributes(tagValue);
          const timeOffset = attrs['TIME-OFFSET']
            ? Number.parseFloat(attrs['TIME-OFFSET']!)
            : 0;
          const precise = attrs['PRECISE'] === 'YES';
          manifest.start = { timeOffset, precise };
          break;
        }

        case 'EXT-X-STREAM-INF': {
          // Start a new variant
          const attrs = parseAttributes(tagValue);
          currentVariant = {
            bandwidth: Number.parseInt(attrs['BANDWIDTH'] || '0', 10),
          };

          if (attrs['AVERAGE-BANDWIDTH']) {
            currentVariant.averageBandwidth = Number.parseInt(
              attrs['AVERAGE-BANDWIDTH']!,
              10,
            );
          }

          if (attrs['CODECS']) {
            currentVariant.codecs = attrs['CODECS'];
          }

          if (attrs['RESOLUTION']) {
            const resolution = parseResolution(attrs['RESOLUTION']!);
            if (resolution) {
              currentVariant.resolution = resolution;
            }
          }

          if (attrs['FRAME-RATE']) {
            currentVariant.frameRate = Number.parseFloat(attrs['FRAME-RATE']!);
          }

          if (attrs['HDCP-LEVEL']) {
            currentVariant.hdcpLevel = attrs['HDCP-LEVEL'];
          }

          if (attrs['AUDIO']) {
            currentVariant.audio = attrs['AUDIO'];
          }

          if (attrs['VIDEO']) {
            currentVariant.video = attrs['VIDEO'];
          }

          if (attrs['SUBTITLES']) {
            currentVariant.subtitles = attrs['SUBTITLES'];
          }

          if (attrs['CLOSED-CAPTIONS']) {
            currentVariant.closedCaptions = attrs['CLOSED-CAPTIONS'];
          }

          break;
        }

        case 'EXT-X-SESSION-DATA': {
          const attrs = parseAttributes(tagValue);
          const sessionData: SessionData = {
            dataId: attrs['DATA-ID'] || '',
          };

          if (attrs['VALUE']) {
            sessionData.value = attrs['VALUE'];
          }

          if (attrs['LANGUAGE']) {
            sessionData.language = attrs['LANGUAGE'];
          }

          if (attrs['URI']) {
            sessionData.uri = attrs['URI'];
          }

          if (!manifest.sessionData) {
            manifest.sessionData = [];
          }
          manifest.sessionData.push(sessionData);
          break;
        }

        case 'EXT-X-SESSION-KEY': {
          const attrs = parseAttributes(tagValue);
          const sessionKey: SessionKey = {
            method: attrs['METHOD'] || 'NONE',
          };

          if (attrs['URI']) {
            sessionKey.uri = attrs['URI'];
          }

          if (attrs['IV']) {
            sessionKey.iv = attrs['IV'];
          }

          if (attrs['KEYFORMAT']) {
            sessionKey.keyFormat = attrs['KEYFORMAT'];
          }

          if (attrs['KEYFORMATVERSIONS']) {
            sessionKey.keyFormatVersions = attrs['KEYFORMATVERSIONS'];
          }

          if (!manifest.sessionKeys) {
            manifest.sessionKeys = [];
          }
          manifest.sessionKeys.push(sessionKey);
          break;
        }
      }
    } else if (token.type === 'URI' && currentVariant) {
      // URI line after EXT-X-STREAM-INF
      currentVariant.uri = token.value;
      manifest.variants.push(currentVariant as Variant);
      currentVariant = null;
    }
  }

  return manifest;
}

