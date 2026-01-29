/**
 * Types for HLS transfer operations
 * Used by @mtngtools/hls-transfer
 */

/**
 * Transfer mode for source
 */
export type SourceMode = 'fetch';

/**
 * Transfer mode for destination
 */
export type DestinationMode = 'fetch' | 'file' | 'custom';

/**
 * Configuration for fetch-based transfer
 */
export interface FetchConfig {
  /** Base URL */
  url: string;
  /** HTTP headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    /** Maximum number of retries */
    maxRetries?: number;
    /** Delay between retries in milliseconds */
    retryDelay?: number;
  };
}

/**
 * Configuration for file-based storage
 */
export interface FileConfig {
  /** Base directory path */
  path: string;
}

/**
 * Configuration for custom storage
 */
export interface CustomConfig {
  /** Custom configuration data */
  [key: string]: unknown;
}

/**
 * Source configuration
 */
export interface SourceConfig {
  /** Transfer mode */
  mode: SourceMode;
  /** Mode-specific configuration */
  config: FetchConfig;
}

/**
 * Destination configuration
 */
export interface DestinationConfig {
  /** Transfer mode */
  mode: DestinationMode;
  /** Mode-specific configuration */
  config: FetchConfig | FileConfig | CustomConfig;
}

/**
 * Concurrency configuration
 */
export interface ConcurrencyConfig {
  /** Maximum concurrent operations */
  maxConcurrent: number;
  /** Maximum concurrent operations per domain (future) */
  maxConcurrentPerDomain?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
}

/**
 * Transfer configuration
 */
export interface TransferConfig {
  /** Source configuration */
  source: SourceConfig & {
    /** Concurrency settings */
    concurrency?: ConcurrencyConfig;
    /** Retry settings */
    retry?: RetryConfig;
  };
  /** Destination configuration */
  destination: DestinationConfig & {
    /** Concurrency settings */
    concurrency?: ConcurrencyConfig;
    /** Retry settings */
    retry?: RetryConfig;
  };
}

