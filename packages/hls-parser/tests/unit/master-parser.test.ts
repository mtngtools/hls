/**
 * Unit tests for master manifest parser
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseMasterManifest } from '../../src/index.js';
import type { TransferContext } from '@mtngtools/hls-types';

describe('parseMasterManifest', () => {
  const fixturesDir = resolve(__dirname, '../../tests/fixtures');
  const context: TransferContext = {
    config: {
      source: {
        mode: 'fetch',
        config: { url: 'https://example.com/master.m3u8' },
      },
      destination: {
        mode: 'file',
        config: { path: '/tmp' },
      },
    },
    metadata: {},
  };

  it('should parse a basic master manifest', async () => {
    const content = readFileSync(resolve(fixturesDir, 'master.m3u8'), 'utf-8');
    const manifest = await parseMasterManifest(content, context);

    expect(manifest).toBeDefined();
    expect(manifest.variants).toHaveLength(3);
    expect(manifest.version).toBe(3);
    expect(manifest.independentSegments).toBe(true);
    expect(manifest.start).toEqual({
      timeOffset: 0.0,
      precise: true,
    });
  });

  it('should parse variant attributes correctly', async () => {
    const content = readFileSync(resolve(fixturesDir, 'master.m3u8'), 'utf-8');
    const manifest = await parseMasterManifest(content, context);

    const variant1 = manifest.variants[0];
    expect(variant1.bandwidth).toBe(1280000);
    expect(variant1.averageBandwidth).toBe(1000000);
    expect(variant1.codecs).toBe('avc1.42e01e,mp4a.40.2');
    expect(variant1.resolution).toEqual({ width: 640, height: 360 });
    expect(variant1.frameRate).toBe(30.0);
    expect(variant1.uri).toBe('variant1.m3u8');
  });

  it('should handle manifests without version', async () => {
    const content = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000
variant.m3u8`;
    const manifest = await parseMasterManifest(content, context);

    expect(manifest.variants).toHaveLength(1);
    expect(manifest.version).toBeUndefined();
  });

  it('should handle empty manifest', async () => {
    const content = '#EXTM3U';
    const manifest = await parseMasterManifest(content, context);

    expect(manifest.variants).toHaveLength(0);
  });
});
