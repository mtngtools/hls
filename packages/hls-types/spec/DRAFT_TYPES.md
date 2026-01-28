# Draft TypeScript Definitions

> [!NOTE]
> These are draft types extracted from the initial `HLS_MONOREPO_PLAN.md`. They serve as a starting point for implementation in `@mtngtools/hls-types`.

```typescript
// Core Types
interface Context {
  // Request state
  headers: Record<string, string>;
  cookies: string[];
  baseUrl: string;
  
  // Transfer state
  sourceConfig: SourceConfig;
  destinationConfig: DestinationConfig;
  
  // Metadata
  metadata: Record<string, unknown>;
  
  // Progress tracking (internal state, not directly exposed)
  // Progress is reported via callbacks in options, not stored here
}

interface MasterManifest {
  version?: number;
  independentSegments?: boolean;
  start?: {
    timeOffset: number;
    precise?: boolean;
  };
  variants: Variant[];
  sessionData?: SessionData[];
  sessionKeys?: SessionKey[];
  // ... other HLS master manifest tags
}

interface SessionData {
  dataId: string;
  value?: string;
  uri?: string;
  language?: string;
}

interface SessionKey {
  method: string;
  uri?: string;
  iv?: string;
  keyFormat?: string;
  keyFormatVersions?: string;
}

interface Variant {
  uri: string;
  bandwidth: number;
  averageBandwidth?: number;
  codecs?: string;
  resolution?: {
    width: number;
    height: number;
  };
  frameRate?: number;
  hdcpLevel?: string;
  audio?: string;
  video?: string;
  subtitles?: string;
  closedCaptions?: string;
  // ... other variant attributes
}

interface VariantManifest {
  version?: number;
  targetDuration: number;
  mediaSequence?: number;
  discontinuitySequence?: number;
  endList?: boolean;
  playlistType?: 'VOD' | 'EVENT';
  chunks: Chunk[];
  // ... other variant manifest tags
}

interface Chunk {
  uri: string;
  duration: number;
  title?: string;
  byteRange?: {
    length: number;
    offset: number;
  };
  discontinuity?: boolean;
  programDateTime?: Date;
  key?: {
    method: string;
    uri?: string;
    iv?: string;
  };
  map?: {
    uri: string;
    byteRange?: {
      length: number;
      offset: number;
    };
  };
  // ... other chunk attributes
}

// Stream type (Web Streams API compatible)
type Stream = ReadableStream<Uint8Array> | NodeJS.ReadableStream;

// Configuration Types
type AuthConfig =
  | {
      type: 'bearer';
      token: string;
    }
  | {
      type: 'basic';
      username: string;
    }
  | {
      type: 'custom';
      custom?: Record<string, unknown>;
    };

interface SourceConfig {
  url: string;
  
  // Custom fetcher configuration
  // Pass a pre-configured instance (ofetch.create()) or options object
  // Types: $Fetch (instance) | FetchOptions (options) - from 'ofetch'
  fetch?: any; // typed as $Fetch | FetchOptions in implementation
  
  headers?: Record<string, string>;
  cookies?: string[];
  auth?: AuthConfig;
  concurrency?: {
    maxConcurrent: number;
    maxConcurrentPerDomain?: number;
  };
  retry?: {
    maxRetries: number;
    retryDelay: number;
  };
}

// Discriminated union for destination config
type DestinationConfig =
  | {
      type: 'local';
      local: {
        basePath: string;
      };
    }
  | {
      type: 'custom';
      custom?: Record<string, unknown>;
    };

// Main Transfer Configuration
interface TransferConfig {
  source: SourceConfig;
  destination: DestinationConfig;
  
  // Plugin overrides for each step
  plugins?: {
    // Step 1: Initial Manifest Fetching
    fetchMasterManifest?: (
      url: string,
      context: Context
    ) => Promise<Response>;
    
    // Step 2: Master Manifest Parsing
    parseMasterManifest?: (
      content: string,
      context: Context
    ) => Promise<MasterManifest>;
    
    // Step 3: Variant Discovery
    discoverVariants?: (
      manifest: MasterManifest,
      context: Context
    ) => Promise<Variant[]>;
    
    // Step 4: Variant Manifest Fetching
    fetchVariantManifest?: (
      variant: Variant,
      context: Context
    ) => Promise<Response>;
    
    // Step 5: Variant Manifest Parsing
    parseVariantManifest?: (
      content: string,
      variant: Variant,
      context: Context
    ) => Promise<VariantManifest>;
    
    // Step 6: Chunk Discovery
    discoverChunks?: (
      manifest: VariantManifest,
      variant: Variant,
      context: Context
    ) => Promise<Chunk[]>;
    
    // Step 7: Chunk Downloading
    downloadChunk?: (
      chunk: Chunk,
      context: Context
    ) => Promise<Stream>;
    
    // Step 8: Destination Path Generation
    generateDestinationPath?: (
      sourcePath: string,
      type: 'master' | 'variant' | 'chunk',
      context: Context
    ) => Promise<string>;
    
    // Step 9: Destination Master Manifest Creation
    createMasterManifest?: (
      variants: Variant[],
      context: Context
    ) => Promise<string>;
    
    // Step 10: Destination Variant Manifest Creation
    createVariantManifest?: (
      chunks: Chunk[],
      variant: Variant,
      context: Context
    ) => Promise<string>;
    
    // Step 11: Chunk Storage
    storeChunk?: (
      stream: Stream,
      path: string,
      chunk: Chunk,
      context: Context
    ) => Promise<void>;
    
    // Step 12: Manifest Storage
    storeManifest?: (
      content: string,
      path: string,
      type: 'master' | 'variant',
      context: Context
    ) => Promise<void>;
  };
  
  // Additional options
  options?: {
    preserveSourceStructure?: boolean;
    // Variant filter receives the variant and all variants for comparison
    variantFilter?: (variant: Variant, allVariants: Variant[]) => boolean;
    chunkFilter?: (chunk: Chunk) => boolean;
    // Overall progress callback - tracks the big picture
    onOverallProgress?: (progress: {
      totalVariants: number;
      completedVariants: number; // Variants that have finished all chunks
      totalChunks: number; // Sum of all chunks across all variants
      completedChunks: number; // Total chunks completed across all variants
      totalBytes: number; // Sum of all chunk sizes
      completedBytes: number; // Total bytes transferred across all variants
      percentage: number; // 0-100, calculated from completedBytes / totalBytes
    }) => void;
    
    // Variant progress callback - tracks individual variant progress
    onVariantProgress?: (progress: {
      variant: Variant;
      totalChunks: number; // Total chunks for this variant
      completedChunks: number; // Chunks completed for this variant
      totalBytes: number; // Total bytes for this variant
      completedBytes: number; // Bytes transferred for this variant
      percentage: number; // 0-100, calculated from completedBytes / totalBytes
      isComplete: boolean; // True when all chunks for this variant are done
    }) => void;
    onError?: (error: Error, step: string, context: Context) => void;
  };
}
```
