/**
 * @mtngtools/hls-types
 * Core types and interfaces for HLS utilities
 */

// Parser types
export type {
  StartTimeOffset,
  SessionData,
  SessionKey,
  MediaGroup,
  Variant,
  MasterManifest,
  EncryptionKey,
  ByteRange,
  MediaInitialization,
  Chunk,
  VariantManifest,
} from './parser.js';

// Transfer types
export type {
  SourceMode,
  DestinationMode,
  FetchConfig,
  FileConfig,
  CustomConfig,
  SourceConfig,
  DestinationConfig,
  ConcurrencyConfig,
  RetryConfig,
  TransferConfig,
} from './transfer.js';

// Core types
export type {
  OverallProgress,
  VariantProgress,
  TransferJobOptions,
  TransferContext,
  FetchResponse,
  TransferStream,
  Fetcher,
  Storage,
  Parser,
  TransferPlugins,
  TransferJob,
  DefaultImplementations,
  PipelineExecutor,
} from './core.js';

// Error types
export {
  HlsError,
  ManifestParseError,
  FetchError,
  StorageError,
  TransferError,
  ValidationError,
} from './errors.js';