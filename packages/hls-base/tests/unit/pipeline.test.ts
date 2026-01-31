/**
 * Unit tests for DefaultPipelineExecutor storeManifest
 */

import { describe, it, expect } from 'vitest';
import { DefaultPipelineExecutor } from '../../src/pipeline.js';
import { MockStorage } from '../integration/helpers.js';
import type { DefaultImplementations, TransferContext, MainManifest } from '@mtngtools/hls-types';
import { OfetchFetcher } from '@mtngtools/hls-transfer';
import { HlsParser } from '../../src/parser.js';

describe('DefaultPipelineExecutor storeManifest', () => {
  it('should store source manifest copy when sourceContent is present', async () => {
    const mockStorage = new MockStorage();
    const defaults: DefaultImplementations = {
      fetcher: new OfetchFetcher(),
      storage: mockStorage,
      parser: new HlsParser(),
    };
    const executor = new DefaultPipelineExecutor(defaults);

    const context: TransferContext = {
      config: {
        source: { mode: 'fetch', config: { url: 'https://example.com/main.m3u8' } },
        destination: { mode: 'file', config: { path: '/tmp/out' } },
      },
      metadata: {},
    };

    const mainManifest: MainManifest = {
      variants: [{ uri: 'v.m3u8', bandwidth: 1000 }],
      sourceContent: '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nv.m3u8',
    };

    await executor.storeManifest(mainManifest, '/tmp/out/main.m3u8', context);

    const stored = mockStorage.getStoredFile('/tmp/out/main.m3u8');
    expect(stored).toBeDefined();
    expect(stored).toContain('#EXTM3U');

    const storedSource = mockStorage.getStoredFile('/tmp/out/main.m3u8.source.txt');
    expect(storedSource).toBeDefined();
    expect(storedSource).toBe(mainManifest.sourceContent);
  });
});
