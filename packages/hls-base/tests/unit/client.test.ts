/**
 * Unit tests for HlsClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HlsClient } from '../../src/client.js';
import { OfetchFetcher } from '@mtngtools/hls-transfer';
import { FsStorage } from '@mtngtools/hls-transfer';
import { HlsParser } from '../../src/parser.js';

// Mock dependencies
vi.mock('@mtngtools/hls-transfer', () => ({
  OfetchFetcher: vi.fn(),
  FsStorage: vi.fn(),
}));

vi.mock('../../src/pipeline.js', () => ({
  DefaultPipelineExecutor: vi.fn().mockImplementation(() => ({
    defaults: {},
  })),
}));

vi.mock('../../src/parser.js', () => ({
  HlsParser: vi.fn().mockImplementation(() => ({})),
}));

describe('HlsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create client with default implementations', () => {
    const client = new HlsClient();

    expect(OfetchFetcher).toHaveBeenCalled();
    expect(FsStorage).toHaveBeenCalled();
    expect(HlsParser).toHaveBeenCalled();
  });

  it('should use custom fetcher when provided', () => {
    const customFetcher = {} as never;
    const client = new HlsClient({ fetcher: customFetcher });

    expect(OfetchFetcher).not.toHaveBeenCalled();
    const executor = client.getExecutor();
    expect(executor).toBeDefined();
  });

  it('should use custom storage when provided', () => {
    const customStorage = {} as never;
    const client = new HlsClient({ storage: customStorage });

    expect(FsStorage).not.toHaveBeenCalled();
    const executor = client.getExecutor();
    expect(executor).toBeDefined();
  });

  it('should use custom parser when provided', () => {
    const customParser = {} as never;
    const client = new HlsClient({ parser: customParser });

    expect(HlsParser).not.toHaveBeenCalled();
    const executor = client.getExecutor();
    expect(executor).toBeDefined();
  });

  it('should accept plugins', () => {
    const plugins = {
      fetchMainManifest: vi.fn(),
    };

    const client = new HlsClient({ plugins });
    const executor = client.getExecutor();
    expect(executor).toBeDefined();
  });

  it('should return executor', () => {
    const client = new HlsClient();
    const executor = client.getExecutor();
    expect(executor).toBeDefined();
  });

  it('should return defaults', () => {
    const client = new HlsClient();
    const defaults = client.getDefaults();
    expect(defaults).toBeDefined();
  });
});
