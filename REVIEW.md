# HLS Monorepo Implementation Review

## Overview

This document provides a comprehensive review of the HLS utilities monorepo implementation progress. As of this review, **4 of 7 packages** have been fully implemented and are building successfully.

## Implementation Status

### ✅ Completed Packages

1. **@mtngtools/hls-types** - Foundation types and interfaces
2. **@mtngtools/hls-utils** - Shared utility functions
3. **@mtngtools/hls-parser** - M3U8 manifest parser
4. **@mtngtools/hls-transfer** - HTTP fetching and filesystem storage

### ⏳ Pending Packages

5. **@mtngtools/hls-core** - Orchestration pipeline (in progress)
6. **@mtngtools/hls-base** - Default client composition
7. **@mtngtools/hls-cli** - Command-line interface

### 📋 Additional Work

- Unit tests for all packages
- Documentation and examples

---

## Package Details

### 1. @mtngtools/hls-types

**Status**: ✅ Complete  
**Purpose**: Single source of truth for TypeScript interfaces

**Structure**:
- `parser.ts` - HLS manifest types (MasterManifest, Variant, VariantManifest, Chunk, etc.)
- `transfer.ts` - Transfer configuration types (SourceConfig, DestinationConfig, etc.)
- `core.ts` - Core orchestration types (TransferContext, TransferJob, Plugins, etc.)

**Key Types**:
```typescript
// Master manifest with variants
interface MasterManifest {
  version?: number;
  independentSegments?: boolean;
  start?: StartTimeOffset;
  variants: Variant[];
  sessionData?: SessionData[];
  sessionKeys?: SessionKey[];
}

// Transfer configuration
interface TransferConfig {
  source: SourceConfig & {
    concurrency?: ConcurrencyConfig;
    retry?: RetryConfig;
  };
  destination: DestinationConfig & {
    concurrency?: ConcurrencyConfig;
    retry?: RetryConfig;
  };
}

// Plugin system with 16 pipeline steps
interface TransferPlugins {
  fetchMasterManifest?: (url: string, context: TransferContext) => Promise<FetchResponse>;
  parseMasterManifest?: (content: string, context: TransferContext) => Promise<MasterManifest>;
  // ... 14 more plugin hooks
}
```

**Design Decisions**:
- Runtime-agnostic types (no Node.js-specific types)
- Organized by package (parser.ts, transfer.ts, core.ts)
- Comprehensive plugin interface for all 16 pipeline steps

---

### 2. @mtngtools/hls-utils

**Status**: ✅ Complete  
**Purpose**: Shared utility functions used across packages

**Modules**:
- `url.ts` - URL manipulation (resolveUrl, parseHlsUrl, getBaseUrl)
- `time.ts` - Time/duration parsing (parseDuration, formatTimestamp)
- `attributes.ts` - HLS tag attribute parsing (parseAttributes, parseResolution, parseByteRange)

**Key Functions**:
```typescript
// Resolve relative URLs (critical for variant/chunk paths)
resolveUrl('https://example.com/path/master.m3u8', 'variant.m3u8')
// => 'https://example.com/path/variant.m3u8'

// Parse HLS attributes with quote handling
parseAttributes('BANDWIDTH=1280000,RESOLUTION="640x360"')
// => { BANDWIDTH: '1280000', RESOLUTION: '640x360' }

// Parse byte ranges
parseByteRange('123@456') // => { length: 123, offset: 456 }
parseByteRange('123')     // => { length: 123 }
```

**Design Decisions**:
- Zero dependencies (except @mtngtools/hls-types)
- Handles edge cases (quoted strings, escaped characters)
- Runtime-agnostic (works in Node.js, browsers, edge runtimes)

---

### 3. @mtngtools/hls-parser

**Status**: ✅ Complete  
**Purpose**: Lightweight M3U8 parser with zero dependencies

**Structure**:
- `tokenizer.ts` - Line-by-line tokenization
- `master-parser.ts` - Master manifest parsing
- `variant-parser.ts` - Variant manifest parsing

**Features**:
- ✅ Master playlist parsing (EXT-X-STREAM-INF, variants, session data)
- ✅ Variant playlist parsing (EXTINF chunks, EXT-X-KEY, EXT-X-MAP, etc.)
- ✅ Handles all standard HLS tags
- ✅ Zero dependencies (only uses @mtngtools/hls-types and @mtngtools/hls-utils)

**Example Usage**:
```typescript
const masterManifest = await parseMasterManifest(m3u8Content, context);
// Returns: { variants: [...], version: 3, ... }

const variantManifest = await parseVariantManifest(m3u8Content, variant, context);
// Returns: { chunks: [...], targetDuration: 10, ... }
```

**Design Decisions**:
- Custom parser (rejected m3u8-parser due to heavy dependencies)
- Line-by-line tokenizer (rejected regex for better edge case handling)
- Supports both sync and async APIs

---

### 4. @mtngtools/hls-transfer

**Status**: ✅ Complete  
**Purpose**: Concrete implementations of Fetcher and Storage interfaces

**Implementations**:
- `OfetchFetcher` - HTTP fetching using ofetch
- `FsStorage` - Filesystem storage using Node.js fs

**OfetchFetcher Features**:
- Uses ofetch for HTTP requests
- Supports custom headers and configuration
- Handles retries and timeouts
- Converts ofetch response to FetchResponse interface
- Properly handles TextEncoder/TextDecoder for data conversion

**FsStorage Features**:
- Streams data to disk (minimizes memory usage)
- Creates directories automatically
- Supports both Web ReadableStream and Node.js streams
- Uses Node.js pipeline for efficient streaming

**Example Usage**:
```typescript
const fetcher = new OfetchFetcher();
const response = await fetcher.fetch(url, context);
const content = await response.text();

const storage = new FsStorage();
await storage.store(stream, '/path/to/file', context);
```

**Design Decisions**:
- Node.js-specific (uses node:fs, node:stream)
- Streams for memory efficiency
- Compatible with TransferStream type (supports both Web and Node streams)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    @mtngtools/hls-types                  │
│              (Foundation - All Interfaces)               │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ hls-utils    │   │ hls-parser   │   │ hls-transfer │
│ (Utilities)  │   │ (Parser)     │   │ (Fetch/Store)│
└──────────────┘   └──────────────┘   └──────────────┘
                            │                   │
                            └─────────┬─────────┘
                                      │
                                      ▼
                            ┌──────────────┐
                            │  hls-core    │
                            │(Orchestration)│
                            └──────────────┘
                                      │
                                      ▼
                            ┌──────────────┐
                            │  hls-base    │
                            │ (Composition)│
                            └──────────────┘
                                      │
                                      ▼
                            ┌──────────────┐
                            │   hls-cli    │
                            │  (CLI Tool)  │
                            └──────────────┘
```

**Dependency Flow**:
1. `hls-types` → No dependencies (foundation - defines all interfaces)
2. `hls-utils` → Depends on `hls-types`
3. `hls-parser` → Depends on `hls-types`, `hls-utils` (implements `Parser` interface)
4. `hls-transfer` → Depends on `hls-types` (implements `Fetcher` and `Storage` interfaces)
5. `hls-core` → Depends only on `hls-types` (uses interfaces, no concrete implementations)
6. `hls-base` → Depends on `hls-core`, `hls-transfer`, `hls-parser` (composes all implementations)
7. `hls-cli` → Depends on `hls-base`

---

## Build Status

All completed packages build successfully:

```bash
✓ @mtngtools/hls-types    - Built successfully (0.00 kB)
✓ @mtngtools/hls-utils    - Built successfully (3.02 kB)
✓ @mtngtools/hls-parser   - Built successfully (7.31 kB)
✓ @mtngtools/hls-transfer - Built successfully (2.61 kB)
```

**Total**: ~13 KB (gzipped: ~4 KB)

---

## Code Quality

- ✅ TypeScript strict mode enabled
- ✅ All packages type-check successfully
- ✅ Proper error handling with cause chains
- ✅ Runtime-agnostic where possible (types, utils, parser)
- ✅ Node.js-specific where needed (transfer package)
- ✅ Comprehensive JSDoc comments
- ✅ Follows monorepo best practices

---

## Next Steps

### Immediate (Core Package)

The `@mtngtools/hls-core` package is the most complex component and needs:

1. **TransferContext** - State management throughout transfer
2. **TransferJob** - Main orchestration class
3. **Pipeline Implementation** - 16-step transfer pipeline:
   - Fetch master manifest
   - Parse master manifest
   - Filter variants
   - Fetch variant manifests
   - Parse variant manifests
   - Discover chunks
   - Filter chunks
   - Create destination manifests
   - Generate paths
   - Store manifests
   - Download chunks
   - Store chunks
   - Finalize

4. **Plugin System** - Allow overriding any pipeline step
5. **Concurrency Control** - Manage concurrent downloads
6. **Progress Tracking** - Callback-based progress updates

### Following Packages

- **hls-base**: Compose core + transfer + parser into default client
- **hls-cli**: CLI wrapper around hls-base

### Testing & Documentation

- Unit tests for all packages (Vitest)
- Integration tests
- Example M3U8 fixtures
- API documentation
- Usage examples

---

## Key Design Decisions

1. **Zero Dependencies for Parser**: Custom parser instead of m3u8-parser to avoid heavy dependencies
2. **Plugin System**: 16 granular hooks allow complete customization
3. **Streaming**: Uses streams throughout to minimize memory usage
4. **Runtime Compatibility**: Types and parser work in Node.js, browsers, and edge runtimes
5. **Monorepo Structure**: Organized by concern, clear dependency hierarchy

---

## Files Created

### Types Package (4 files)
- `packages/hls-types/src/index.ts`
- `packages/hls-types/src/parser.ts`
- `packages/hls-types/src/transfer.ts`
- `packages/hls-types/src/core.ts`

### Utils Package (4 files)
- `packages/hls-utils/src/index.ts`
- `packages/hls-utils/src/url.ts`
- `packages/hls-utils/src/time.ts`
- `packages/hls-utils/src/attributes.ts`

### Parser Package (4 files)
- `packages/hls-parser/src/index.ts`
- `packages/hls-parser/src/tokenizer.ts`
- `packages/hls-parser/src/master-parser.ts`
- `packages/hls-parser/src/variant-parser.ts`

### Transfer Package (3 files)
- `packages/hls-transfer/src/index.ts`
- `packages/hls-transfer/src/fetcher.ts`
- `packages/hls-transfer/src/storage.ts`

**Total**: 15 new implementation files

---

## Questions for Review

1. **Type Definitions**: Are the type definitions comprehensive enough? Any missing fields?
2. **Parser Coverage**: Does the parser handle all required HLS tags?
3. **Error Handling**: Is error handling sufficient? Should we add more specific error types?
4. **Stream Handling**: Is the stream conversion logic correct for both Web and Node.js streams?
5. **Architecture**: Does the package structure make sense? Any concerns about dependencies?

---

## Summary

**Progress**: 4/7 packages complete (57%)  
**Code Quality**: High - all packages build and type-check  
**Architecture**: Well-structured, follows specifications  
**Next**: Core orchestration package (most complex component)

The foundation is solid. The remaining work focuses on orchestration logic, composition, and CLI interface.

