/**
 * Unit tests for variant manifest parser
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseVariantManifest } from '../../src/index.js';
import type { TransferContext, Variant } from '@mtngtools/hls-types';

describe('parseVariantManifest', () => {
  const fixturesDir = resolve(__dirname, '../../tests/fixtures');
  const context: TransferContext = {
    config: {
      source: {
        mode: 'fetch',
        config: { url: 'https://example.com/variant.m3u8' },
      },
      destination: {
        mode: 'file',
        config: { path: '/tmp' },
      },
    },
    metadata: {},
  };

  const variant: Variant = {
    uri: 'variant.m3u8',
    bandwidth: 1280000,
  };

  it('should parse a basic variant manifest', async () => {
    const content = readFileSync(resolve(fixturesDir, 'variant.m3u8'), 'utf-8');
    const manifest = await parseVariantManifest(content, variant, context);

    expect(manifest).toBeDefined();
    expect(manifest.targetDuration).toBe(10);
    expect(manifest.mediaSequence).toBe(0);
    expect(manifest.playlistType).toBe('VOD');
    expect(manifest.endList).toBe(true);
    expect(manifest.chunks).toHaveLength(4);
  });

  it('should parse chunks correctly', async () => {
    const content = readFileSync(resolve(fixturesDir, 'variant.m3u8'), 'utf-8');
    const manifest = await parseVariantManifest(content, variant, context);

    const chunk1 = manifest.chunks[0];
    expect(chunk1.duration).toBe(10.0);
    expect(chunk1.uri).toBe('segment001.ts');
    expect(chunk1.discontinuity).toBeUndefined();

    const chunk3 = manifest.chunks[2];
    expect(chunk3.discontinuity).toBe(true);
  });

  it('should parse encryption keys', async () => {
    const content = readFileSync(resolve(fixturesDir, 'variant.m3u8'), 'utf-8');
    const manifest = await parseVariantManifest(content, variant, context);

    const chunk1 = manifest.chunks[0];
    expect(chunk1.key).toBeDefined();
    expect(chunk1.key?.method).toBe('AES-128');
    expect(chunk1.key?.uri).toBe('https://example.com/key');
    expect(chunk1.key?.iv).toBe('0x00000000000000000000000000000001');
  });

  it('should parse initialization segments', async () => {
    const content = readFileSync(resolve(fixturesDir, 'variant.m3u8'), 'utf-8');
    const manifest = await parseVariantManifest(content, variant, context);

    const chunk1 = manifest.chunks[0];
    expect(chunk1.map).toBeDefined();
    expect(chunk1.map?.uri).toBe('init.mp4');
    expect(chunk1.map?.byteRange).toEqual({ length: 1000, offset: 0 });
  });
});
