/**
 * HLS Client - Default entry point with pre-configured implementations
 */

import type {
  DefaultImplementations,
  PipelineExecutor,
  TransferPlugins,
  Fetcher,
  Storage,
  Parser,
} from '@mtngtools/hls-types';
import { DefaultPipelineExecutor } from './pipeline.js';
import { HlsParser } from './parser.js';
import { OfetchFetcher } from '@mtngtools/hls-transfer';
import { FsStorage } from '@mtngtools/hls-transfer';

/**
 * HLS Client configuration
 */
export interface HlsClientConfig {
  /** Custom Fetcher implementation (defaults to OfetchFetcher) */
  fetcher?: Fetcher;
  /** Custom Storage implementation (defaults to FsStorage) */
  storage?: Storage;
  /** Custom Parser implementation (defaults to HlsParser) */
  parser?: Parser;
  /** Plugin overrides for pipeline steps */
  plugins?: TransferPlugins;
}

/**
 * HlsClient - Default HLS client with batteries included
 *
 * Provides a pre-configured client with default implementations:
 * - OfetchFetcher for HTTP requests
 * - FsStorage for file system storage
 * - HlsParser for manifest parsing
 *
 * All implementations can be overridden via constructor options,
 * and individual pipeline steps can be overridden via plugins.
 */
export class HlsClient {
  private executor: PipelineExecutor;

  constructor(config: HlsClientConfig = {}) {
    const defaults: DefaultImplementations = {
      fetcher: config.fetcher ?? new OfetchFetcher(),
      storage: config.storage ?? new FsStorage(),
      parser: config.parser ?? new HlsParser(),
    };

    this.executor = new DefaultPipelineExecutor(defaults, config.plugins);
  }

  /**
   * Get the pipeline executor
   * This is used by hls-core to execute pipeline steps
   */
  getExecutor(): PipelineExecutor {
    return this.executor;
  }

  /**
   * Get the default implementations
   * Useful for inspection or advanced use cases
   */
  getDefaults(): DefaultImplementations {
    return (this.executor as DefaultPipelineExecutor).defaults;
  }
}

