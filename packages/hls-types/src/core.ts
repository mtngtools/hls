/**
 * Types for HLS core orchestration
 * Used by @mtngtools/hls-core
 */

import type { MasterManifest, Variant, VariantManifest, Chunk } from './parser.js';
import type { TransferConfig } from './transfer.js';

/**
 * Progress information for overall transfer
 */
export interface OverallProgress {
  /** Total number of variants */
  totalVariants: number;
  /** Number of completed variants */
  completedVariants: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Number of completed chunks */
  completedChunks: number;
  /** Total bytes transferred */
  totalBytes: number;
  /** Bytes transferred so far */
  transferredBytes: number;
}

/**
 * Progress information for a single variant
 */
export interface VariantProgress {
  /** Variant being processed */
  variant: Variant;
  /** Total chunks in this variant */
  totalChunks: number;
  /** Completed chunks */
  completedChunks: number;
  /** Total bytes for this variant */
  totalBytes: number;
  /** Bytes transferred for this variant */
  transferredBytes: number;
}

/**
 * Transfer job options
 */
export interface TransferJobOptions {
  /** Callback for overall progress updates */
  onOverallProgress?: (progress: OverallProgress) => void;
  /** Callback for variant progress updates */
  onVariantProgress?: (progress: VariantProgress) => void;
  /** Callback for errors */
  onError?: (error: Error, context: TransferContext) => void;
}

/**
 * Transfer context - maintains state throughout the transfer process
 */
export interface TransferContext {
  /** Transfer configuration */
  config: TransferConfig;
  /** Master manifest (available after step 2) */
  masterManifest?: MasterManifest;
  /** Filtered variants (available after step 3) */
  filteredVariants?: Variant[];
  /** Arbitrary metadata storage */
  metadata: Record<string, unknown>;
}

/**
 * Response headers type
 * Compatible with Web Standards Headers and plain objects
 */
export type ResponseHeaders = {
  get(name: string): string | null;
  has(name: string): boolean;
  forEach(callback: (value: string, key: string) => void): void;
  [Symbol.iterator](): IterableIterator<[string, string]>;
} | Record<string, string>;

/**
 * Response type for fetch operations
 * Compatible with Web Standards Response and Node.js fetch Response
 */
export interface FetchResponse {
  /** Response body as text */
  text(): Promise<string>;
  /** Response body as array buffer */
  arrayBuffer(): Promise<ArrayBuffer>;
  /** Response headers */
  headers: ResponseHeaders;
  /** Response status */
  status: number;
  /** Response status text */
  statusText: string;
  /** Whether response is ok */
  ok: boolean;
}

/**
 * Stream type for chunk downloads/uploads
 * Compatible with Web Standards ReadableStream and Node.js streams
 * Using unknown to be runtime-agnostic
 */
export type TransferStream = unknown;

/**
 * Fetcher interface - abstracts HTTP fetching
 */
export interface Fetcher {
  /**
   * Fetch a resource
   * @param url - URL to fetch
   * @param context - Transfer context
   * @returns Promise resolving to response
   */
  fetch(url: string, context: TransferContext): Promise<FetchResponse>;
}

/**
 * Storage interface - abstracts storage operations
 */
export interface Storage {
  /**
   * Store data at a path
   * @param stream - Stream of data to store
   * @param path - Destination path
   * @param context - Transfer context
   * @returns Promise that resolves when storage is complete
   */
  store(stream: TransferStream, path: string, context: TransferContext): Promise<void>;
}

/**
 * Parser interface - abstracts manifest parsing
 */
export interface Parser {
  /**
   * Parse a master manifest
   * @param content - Manifest content as string
   * @param context - Transfer context
   * @returns Promise resolving to parsed master manifest
   */
  parseMasterManifest(content: string, context: TransferContext): Promise<MasterManifest>;

  /**
   * Parse a variant manifest
   * @param content - Manifest content as string
   * @param variant - Variant being parsed
   * @param context - Transfer context
   * @returns Promise resolving to parsed variant manifest
   */
  parseVariantManifest(
    content: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<VariantManifest>;
}

/**
 * Plugin interface for overriding pipeline steps
 */
export interface TransferPlugins {
  /** Step 1: Fetch Master Manifest */
  fetchMasterManifest?: (
    url: string,
    context: TransferContext,
  ) => Promise<FetchResponse>;

  /** Step 2: Parse Master Manifest */
  parseMasterManifest?: (
    content: string,
    context: TransferContext,
  ) => Promise<MasterManifest>;

  /** Step 3: Filter Variants */
  filterVariants?: (context: TransferContext) => Promise<Variant[]>;

  /** Step 4: Fetch Variant Manifest */
  fetchVariantManifest?: (
    variant: Variant,
    context: TransferContext,
  ) => Promise<FetchResponse>;

  /** Step 5: Parse Variant Manifest */
  parseVariantManifest?: (
    content: string,
    variant: Variant,
    context: TransferContext,
  ) => Promise<VariantManifest>;

  /** Step 6: Chunk Discovery */
  discoverChunks?: (
    manifest: VariantManifest,
    variant: Variant,
    context: TransferContext,
  ) => Promise<Chunk[]>;

  /** Step 7: Chunk Filter */
  filterChunks?: (
    manifest: VariantManifest,
    variant: Variant,
    chunks: Chunk[],
    context: TransferContext,
  ) => Promise<Chunk[]>;

  /** Step 8: Create Destination Master Manifest */
  createDestinationMasterManifest?: (context: TransferContext) => Promise<string>;

  /** Step 9: Generate Master Manifest Path */
  generateMasterManifestPath?: (
    sourcePath: string,
    manifest: MasterManifest,
    context: TransferContext,
  ) => Promise<string>;

  /** Step 10: Store Manifest */
  storeManifest?: (
    manifest: MasterManifest | VariantManifest,
    path: string,
    context: TransferContext,
  ) => Promise<void>;

  /** Step 11: Create Destination Variant Manifest */
  createDestinationVariantManifest?: (
    chunks: Chunk[],
    variant: Variant,
    context: TransferContext,
  ) => Promise<string>;

  /** Step 12: Generate Variant Manifest Path */
  generateVariantManifestPath?: (
    sourcePath: string,
    variant: Variant,
    context: TransferContext,
  ) => Promise<string>;

  /** Step 13: Download Chunk */
  downloadChunk?: (
    chunk: Chunk,
    context: TransferContext,
  ) => Promise<TransferStream>;

  /** Step 14: Generate Chunk Path */
  generateChunkPath?: (
    sourcePath: string,
    variant: Variant,
    manifest: VariantManifest,
    chunk: Chunk,
    context: TransferContext,
  ) => Promise<string>;

  /** Step 15: Store Chunk */
  storeChunk?: (
    stream: TransferStream,
    path: string,
    chunk: Chunk,
    context: TransferContext,
  ) => Promise<void>;

  /** Step 16: Finalize */
  finalize?: (context: TransferContext) => Promise<void>;
}

/**
 * Default implementations container
 * Provides default implementations for Fetcher, Storage, and Parser
 */
export interface DefaultImplementations {
  /** Default Fetcher implementation */
  fetcher: Fetcher;
  /** Default Storage implementation */
  storage: Storage;
  /** Default Parser implementation */
  parser: Parser;
}

/**
 * Pipeline step executor
 * Provides methods for executing each pipeline step
 * with automatic fallback to defaults when plugins don't override
 */
export interface PipelineExecutor {
  /** Step 1: Fetch Master Manifest */
  fetchMasterManifest(url: string, context: TransferContext): Promise<FetchResponse>;

  /** Step 2: Parse Master Manifest */
  parseMasterManifest(content: string, context: TransferContext): Promise<MasterManifest>;

  /** Step 3: Filter Variants */
  filterVariants(context: TransferContext): Promise<Variant[]>;

  /** Step 4: Fetch Variant Manifest */
  fetchVariantManifest(variant: Variant, context: TransferContext): Promise<FetchResponse>;

  /** Step 5: Parse Variant Manifest */
  parseVariantManifest(
    content: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<VariantManifest>;

  /** Step 6: Chunk Discovery */
  discoverChunks(
    manifest: VariantManifest,
    variant: Variant,
    context: TransferContext,
  ): Promise<Chunk[]>;

  /** Step 7: Chunk Filter */
  filterChunks(
    manifest: VariantManifest,
    variant: Variant,
    chunks: Chunk[],
    context: TransferContext,
  ): Promise<Chunk[]>;

  /** Step 8: Create Destination Master Manifest */
  createDestinationMasterManifest(context: TransferContext): Promise<string>;

  /** Step 9: Generate Master Manifest Path */
  generateMasterManifestPath(
    sourcePath: string,
    manifest: MasterManifest,
    context: TransferContext,
  ): Promise<string>;

  /** Step 10: Store Manifest */
  storeManifest(
    manifest: MasterManifest | VariantManifest,
    path: string,
    context: TransferContext,
  ): Promise<void>;

  /** Step 11: Create Destination Variant Manifest */
  createDestinationVariantManifest(
    chunks: Chunk[],
    variant: Variant,
    context: TransferContext,
  ): Promise<string>;

  /** Step 12: Generate Variant Manifest Path */
  generateVariantManifestPath(
    sourcePath: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<string>;

  /** Step 13: Download Chunk */
  downloadChunk(chunk: Chunk, context: TransferContext): Promise<TransferStream>;

  /** Step 14: Generate Chunk Path */
  generateChunkPath(
    sourcePath: string,
    variant: Variant,
    manifest: VariantManifest,
    chunk: Chunk,
    context: TransferContext,
  ): Promise<string>;

  /** Step 15: Store Chunk */
  storeChunk(
    stream: TransferStream,
    path: string,
    chunk: Chunk,
    context: TransferContext,
  ): Promise<void>;

  /** Step 16: Finalize */
  finalize(context: TransferContext): Promise<void>;
}

/**
 * Transfer job configuration
 */
export interface TransferJob {
  /** Transfer configuration */
  transferConfig: TransferConfig;
  /** Plugin overrides */
  plugins?: TransferPlugins;
  /** Job options */
  options?: TransferJobOptions;
}

