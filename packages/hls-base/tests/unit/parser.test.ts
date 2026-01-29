/**
 * Unit tests for HlsParser wrapper
 */

import { describe, it, expect, vi } from 'vitest';
import { HlsParser } from '../../src/parser.js';
import type { TransferContext, Variant } from '@mtngtools/hls-types';

// Mock the parser functions
vi.mock('@mtngtools/hls-parser', () => ({
  parseMasterManifest: vi.fn(),
  parseVariantManifest: vi.fn(),
}));

import { parseMasterManifest, parseVariantManifest } from '@mtngtools/hls-parser';

describe('HlsParser', () => {
  const mockContext: TransferContext = {
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

  const mockVariant: Variant = {
    uri: 'variant.m3u8',
    bandwidth: 1280000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse master manifest', async () => {
    const mockManifest = {
      variants: [],
      version: 3,
    };

    vi.mocked(parseMasterManifest).mockResolvedValue(mockManifest as never);

    const parser = new HlsParser();
    const result = await parser.parseMasterManifest('#EXTM3U', mockContext);

    expect(parseMasterManifest).toHaveBeenCalledWith('#EXTM3U', mockContext);
    expect(result).toEqual(mockManifest);
  });

  it('should parse variant manifest', async () => {
    const mockVariantManifest = {
      chunks: [],
      targetDuration: 10,
    };

    vi.mocked(parseVariantManifest).mockResolvedValue(mockVariantManifest as never);

    const parser = new HlsParser();
    const result = await parser.parseVariantManifest('#EXTM3U', mockVariant, mockContext);

    expect(parseVariantManifest).toHaveBeenCalledWith('#EXTM3U', mockVariant, mockContext);
    expect(result).toEqual(mockVariantManifest);
  });
});
