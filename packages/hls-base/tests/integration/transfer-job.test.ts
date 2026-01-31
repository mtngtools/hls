/**
 * Integration tests for TransferJobExecutor
 * Tests the full transfer pipeline with mocked HTTP and storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { beforeAll, afterAll } from 'vitest';
import { TransferJobExecutor } from '@mtngtools/hls-core';
import { MockStorage, createHandlers, setupMockServer, createMockChunkData } from './helpers.js';
import type {
  TransferJob,
  TransferConfig,
  DefaultImplementations,
} from '@mtngtools/hls-types';
import { OfetchFetcher } from '@mtngtools/hls-transfer';
import { DefaultPipelineExecutor } from '@mtngtools/hls-base';
import { HlsParser } from '@mtngtools/hls-base';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { http, HttpResponse } from 'msw';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('TransferJobExecutor Integration Tests', () => {
  let mockStorage: MockStorage;
  let server: ReturnType<typeof setupMockServer>;
  const fixturesDir = resolve(__dirname, '../../../hls-parser/tests/fixtures');

  beforeAll(() => {
    // Setup MSW server
    server = setupMockServer([]);
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    mockStorage = new MockStorage();
    server.resetHandlers();
  });

  afterEach(() => {
    mockStorage.clear();
  });

  it('should execute full transfer pipeline', async () => {
    // Load test fixtures
    const mainManifest = readFileSync(
      resolve(fixturesDir, 'main.m3u8'),
      'utf-8',
    );
    const variantManifest = readFileSync(
      resolve(fixturesDir, 'variant.m3u8'),
      'utf-8',
    );

    // Create mock chunk data
    const chunk1 = createMockChunkData(1024);
    const chunk2 = createMockChunkData(1024);
    const chunk3 = createMockChunkData(1024);
    const chunk4 = createMockChunkData(512);

    // Setup HTTP handlers
    const handlers = createHandlers({
      mainManifest,
      variantManifests: {
        'variant1.m3u8': variantManifest,
      },
      chunks: {
        'segment001.ts': chunk1,
        'segment002.ts': chunk2,
        'segment003.ts': chunk3,
        'segment004.ts': chunk4,
      },
      baseUrl: 'https://example.com',
    });
    // Remove catch-all and add specific handlers
    server.resetHandlers();
    server.use(...handlers);

    // Create transfer config
    const transferConfig: TransferConfig = {
      source: {
        mode: 'fetch',
        config: {
          url: 'https://example.com/main.m3u8',
        },
        concurrency: {
          maxConcurrent: 2,
        },
        retry: {
          maxRetries: 1,
          retryDelay: 100,
        },
      },
      destination: {
        mode: 'file',
        config: {
          path: '/tmp/hls-output',
        },
      },
    };

    // Create pipeline executor with mock storage
    const defaults: DefaultImplementations = {
      fetcher: new OfetchFetcher(),
      storage: mockStorage,
      parser: new HlsParser(),
    };
    const pipelineExecutor = new DefaultPipelineExecutor(defaults);

    // Create transfer job
    const onError = vi.fn();
    const onOverallProgress = vi.fn();
    const onVariantProgress = vi.fn();
    const job: TransferJob = {
      transferConfig,
      options: {
        onOverallProgress,
        onVariantProgress,
        onError,
      },
    };

    // Create transfer job executor
    const executor = new TransferJobExecutor(job, pipelineExecutor);

    // Filter variants to only process variant1 (since we only set up handlers for it)
    const executorInternal = executor as unknown as { executor: { filterVariants: (context: unknown) => Promise<unknown[]> } };
    const originalFilter = executorInternal.executor.filterVariants;
    executorInternal.executor.filterVariants = async function (context: unknown) {
      const allVariants = await originalFilter.call(this, context);
      // Filter to only variant1
      return allVariants.filter((v: unknown) => {
        if (v && typeof v === 'object' && 'uri' in v) {
          return (v as { uri: string }).uri === 'variant1.m3u8';
        }
        return false;
      });
    };

    // Execute transfer
    await executor.execute();

    // Verify main manifest was stored
    const storedMain = mockStorage.getStoredFile('/tmp/hls-output/main.m3u8');
    expect(storedMain).toBeDefined();
    expect(storedMain).toContain('#EXTM3U');

    // Verify source manifest copy was stored for main
    const storedMainSource = mockStorage.getStoredFile('/tmp/hls-output/main.m3u8.source.txt');
    expect(storedMainSource).toBeDefined();
    expect(storedMainSource).toBe(mainManifest);

    // Verify variant manifest was stored
    const storedVariant = mockStorage.getStoredFile('/tmp/hls-output/variant1.m3u8');
    expect(storedVariant).toBeDefined();
    expect(storedVariant).toContain('#EXTM3U');

    // Verify source manifest copy was stored for variant
    const storedVariantSource = mockStorage.getStoredFile('/tmp/hls-output/variant1.m3u8.source.txt');
    expect(storedVariantSource).toBeDefined();
    expect(storedVariantSource).toBe(variantManifest);

    // Verify chunks were stored
    expect(mockStorage.getStoredFile('/tmp/hls-output/001.ts')).toBeDefined();
    expect(mockStorage.getStoredFile('/tmp/hls-output/002.ts')).toBeDefined();
    expect(mockStorage.getStoredFile('/tmp/hls-output/003.ts')).toBeDefined();
    expect(mockStorage.getStoredFile('/tmp/hls-output/004.ts')).toBeDefined();

    // Verify progress callbacks were called
    expect(job.options.onOverallProgress).toHaveBeenCalled();
    expect(job.options.onVariantProgress).toHaveBeenCalled();
  });

  it('should handle multiple variants', async () => {
    const mainManifest = readFileSync(
      resolve(fixturesDir, 'main.m3u8'),
      'utf-8',
    );
    const variantManifest = readFileSync(
      resolve(fixturesDir, 'variant.m3u8'),
      'utf-8',
    );

    // Setup handlers for all 3 variants with chunks
    const handlers = createHandlers({
      mainManifest,
      variantManifests: {
        'variant1.m3u8': variantManifest,
        'variant2.m3u8': variantManifest,
        'variant3.m3u8': variantManifest,
      },
      chunks: {
        'segment001.ts': createMockChunkData(1024),
        'segment002.ts': createMockChunkData(1024),
        'segment003.ts': createMockChunkData(1024),
        'segment004.ts': createMockChunkData(512),
      },
      baseUrl: 'https://example.com',
    });
    server.resetHandlers();
    server.use(...handlers);

    const transferConfig: TransferConfig = {
      source: {
        mode: 'fetch',
        config: {
          url: 'https://example.com/main.m3u8',
        },
        concurrency: {
          maxConcurrent: 2,
        },
      },
      destination: {
        mode: 'file',
        config: {
          path: '/tmp/hls-output',
        },
      },
    };

    const defaults: DefaultImplementations = {
      fetcher: new OfetchFetcher(),
      storage: mockStorage,
      parser: new HlsParser(),
    };
    const pipelineExecutor = new DefaultPipelineExecutor(defaults);

    const job: TransferJob = {
      transferConfig,
      options: {
        onOverallProgress: vi.fn(),
        onVariantProgress: vi.fn(),
      },
    };

    const executor = new TransferJobExecutor(job, pipelineExecutor);
    await executor.execute();

    // Verify all variants were processed
    const progressCalls = (job.options.onOverallProgress as ReturnType<typeof vi.fn>).mock.calls;
    const lastProgress = progressCalls[progressCalls.length - 1]?.[0];
    expect(lastProgress?.completedVariants).toBe(3);
    expect(lastProgress?.totalVariants).toBe(3);

    // Verify variant manifests were stored
    expect(mockStorage.getStoredFile('/tmp/hls-output/variant1.m3u8')).toBeDefined();
    expect(mockStorage.getStoredFile('/tmp/hls-output/variant2.m3u8')).toBeDefined();
    expect(mockStorage.getStoredFile('/tmp/hls-output/variant3.m3u8')).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const mainManifest = readFileSync(
      resolve(fixturesDir, 'main.m3u8'),
      'utf-8',
    );
    const variantManifest = readFileSync(
      resolve(fixturesDir, 'variant.m3u8'),
      'utf-8',
    );

    // Filter to only variant1
    const defaults: DefaultImplementations = {
      fetcher: new OfetchFetcher(),
      storage: mockStorage,
      parser: new HlsParser(),
    };
    const pipelineExecutor = new DefaultPipelineExecutor(defaults, {
      filterVariants: async (context) => {
        // Only process variant1
        if (context.mainManifest) {
          return context.mainManifest.variants.filter((v) => v.uri === 'variant1.m3u8');
        }
        return [];
      },
    });

    // Setup handlers with one chunk that will fail (segment002.ts missing)
    const handlers = createHandlers({
      mainManifest,
      variantManifests: {
        'variant1.m3u8': variantManifest,
      },
      chunks: {
        'segment001.ts': createMockChunkData(1024),
        // segment002.ts will fail (not in handlers)
        'segment003.ts': createMockChunkData(1024),
        'segment004.ts': createMockChunkData(512),
      },
      baseUrl: 'https://example.com',
    });
    server.resetHandlers();
    server.use(...handlers);

    const transferConfig: TransferConfig = {
      source: {
        mode: 'fetch',
        config: {
          url: 'https://example.com/main.m3u8',
        },
        retry: {
          maxRetries: 0, // No retries for faster test
          retryDelay: 100,
        },
      },
      destination: {
        mode: 'file',
        config: {
          path: '/tmp/hls-output',
        },
      },
    };

    const onError = vi.fn();
    const job: TransferJob = {
      transferConfig,
      options: {
        onError,
      },
    };

    const executor = new TransferJobExecutor(job, pipelineExecutor);

    // Should throw error when chunk fails (segment002.ts is missing)
    await expect(executor.execute()).rejects.toThrow();
    expect(onError).toHaveBeenCalled();
  });

  it('should respect concurrency limits', async () => {
    const mainManifest = readFileSync(
      resolve(fixturesDir, 'main.m3u8'),
      'utf-8',
    );
    const variantManifest = readFileSync(
      resolve(fixturesDir, 'variant.m3u8'),
      'utf-8',
    );

    // Track concurrent requests
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const chunkHandlers = ['segment001.ts', 'segment002.ts', 'segment003.ts', 'segment004.ts'].map(
      (chunk) => {
        // Resolve chunk URL correctly
        const chunkUrl = new URL(chunk, 'https://example.com').href;
        return http.get(chunkUrl, async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate download time
          currentConcurrent--;
          return HttpResponse.arrayBuffer(createMockChunkData(1024), {
            headers: { 'Content-Type': 'video/mp2t' },
          });
        });
      },
    );

    const handlers = createHandlers({
      mainManifest,
      variantManifests: {
        'variant1.m3u8': variantManifest,
      },
      baseUrl: 'https://example.com',
    });

    server.resetHandlers();
    server.use(...handlers, ...chunkHandlers);

    const transferConfig: TransferConfig = {
      source: {
        mode: 'fetch',
        config: {
          url: 'https://example.com/main.m3u8',
        },
        concurrency: {
          maxConcurrent: 2, // Limit to 2 concurrent downloads
        },
      },
      destination: {
        mode: 'file',
        config: {
          path: '/tmp/hls-output',
        },
        concurrency: {
          maxConcurrent: 2,
        },
      },
    };

    const concurrencyDefaults: DefaultImplementations = {
      fetcher: new OfetchFetcher(),
      storage: mockStorage,
      parser: new HlsParser(),
    };
    const concurrencyPipelineExecutor = new DefaultPipelineExecutor(concurrencyDefaults, {
      filterVariants: async (context) => {
        if (context.mainManifest) {
          return context.mainManifest.variants.filter((v) => v.uri === 'variant1.m3u8');
        }
        return [];
      },
    });

    const concurrencyJob: TransferJob = {
      transferConfig,
    };

    const concurrencyExecutor = new TransferJobExecutor(concurrencyJob, concurrencyPipelineExecutor);
    await concurrencyExecutor.execute();

    // Verify concurrency limit was respected
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});
