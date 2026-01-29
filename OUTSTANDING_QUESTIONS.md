# Outstanding Questions & Design Decisions

This document walks through outstanding questions and design decisions that need to be resolved before completing the implementation.

---

## 1. Type Definitions & Completeness

### Question: Are the type definitions comprehensive enough? Any missing fields?

**Current State:**
- ✅ Master manifest types (variants, session data, session keys)
- ✅ Variant manifest types (chunks, encryption keys, byte ranges)
- ✅ Transfer configuration types
- ✅ Plugin interfaces (16 pipeline steps)

**Potential Gaps:**

1. **Error Types**: Currently using generic `Error`. Should we have specific error types?
   ```typescript
   // Proposed:
   class HlsTransferError extends Error {}
   class ManifestParseError extends HlsTransferError {}
   class FetchError extends HlsTransferError {}
   class StorageError extends HlsTransferError {}
   ```

2. **Media Groups**: `MediaGroup` type is defined but not fully integrated into `Variant`
   - Variant has `audio`, `video`, `subtitles`, `closedCaptions` as strings (group IDs)
   - Should we have a richer structure linking variants to media groups?
   - **Status**: ✅ Documented in `packages/hls-parser/spec/README.md` for future consideration

3. **Playlist Reload**: For live streams, should we support playlist reload intervals?
   - `EXT-X-PLAYLIST-TYPE: EVENT` playlists can be updated
   - No current support for polling/reloading

4. **Custom Tags**: Should we support custom/unknown tags?
   - Currently parser ignores unknown tags
   - Should we preserve them in a `customTags?: Record<string, string>` field?

**Recommendation**: 
- ✅ Add specific error types (improves debugging) - **COMPLETED**
- ✅ Media groups: Documented in `packages/hls-parser/spec/README.md` for future consideration
- ✅ Playlist reload: Documented in `packages/hls-parser/spec/README.md` for future consideration
- ✅ Custom tags: Documented in `packages/hls-parser/spec/README.md` for future consideration

---

## 2. Parser Coverage

### Question: Does the parser handle all required HLS tags?

**Current Coverage:**

✅ **Master Playlist Tags:**
- `EXTM3U` (header)
- `EXT-X-VERSION`
- `EXT-X-INDEPENDENT-SEGMENTS`
- `EXT-X-START`
- `EXT-X-STREAM-INF` (variants)
- `EXT-X-SESSION-DATA`
- `EXT-X-SESSION-KEY`

✅ **Variant Playlist Tags:**
- `EXT-X-VERSION`
- `EXT-X-TARGETDURATION`
- `EXT-X-MEDIA-SEQUENCE`
- `EXT-X-DISCONTINUITY-SEQUENCE`
- `EXT-X-PLAYLIST-TYPE`
- `EXT-X-ENDLIST`
- `EXTINF` (chunks)
- `EXT-X-BYTERANGE`
- `EXT-X-DISCONTINUITY`
- `EXT-X-KEY` (encryption)
- `EXT-X-MAP` (initialization segments)
- `EXT-X-PROGRAM-DATE-TIME`

**Potentially Missing:**

1. **`EXT-X-MEDIA`**: Media group definitions (audio tracks, subtitles)
   - Currently: Variant references groups by ID
   - Missing: Full media group definitions
   - Impact: Low for transfer use case (we just need URIs)
   - **Status**: ✅ Documented in `packages/hls-parser/spec/README.md` under "Future Enhancements"

2. **`EXT-X-I-FRAMES-ONLY`**: I-frame only playlists
   - Impact: Low (rare, mostly for trick play)
   - **Status**: ✅ Documented in `packages/hls-parser/spec/README.md` under "Future Enhancements"

3. **`EXT-X-SKIP`**: Skip segments (for VOD)
   - Impact: Medium (could affect chunk discovery)
   - **Status**: ✅ Documented in `packages/hls-parser/spec/README.md` under "Future Enhancements"

4. **`EXT-X-DATERANGE`**: Date range metadata
   - Impact: Low (metadata only)
   - **Status**: ✅ Documented in `packages/hls-parser/spec/README.md` under "Future Enhancements"

5. **`EXT-X-GAP`**: Gap segments
   - Impact: Medium (affects chunk handling)
   - **Status**: ✅ Documented in `packages/hls-parser/spec/README.md` under "Future Enhancements"

**Recommendation**: 
- ✅ Current coverage is sufficient for MVP (CDN-to-CDN transfer)
- ✅ All potentially missing tags documented in parser spec for future consideration
- ⚠️ Add `EXT-X-SKIP` and `EXT-X-GAP` if we encounter them in real manifests

---

## 3. Error Handling

### Question: Is error handling sufficient? Should we add more specific error types?

**Current State:**
- Generic `Error` with cause chains
- Error callbacks in `TransferJobOptions.onError`

**Issues:**

1. **No Error Classification**: Hard to handle errors programmatically
   ```typescript
   // Current:
   catch (error) {
     throw new Error(`Failed to fetch ${url}`, { cause: error });
   }
   
   // Proposed:
   catch (error) {
     throw new FetchError(`Failed to fetch ${url}`, { cause: error, url });
   }
   ```

2. **Error Context**: Missing contextual information
   - Which step failed?
   - Which variant/chunk?
   - Retryable vs non-retryable?

3. **Error Recovery**: No strategy for partial failures
   - What if one variant fails but others succeed?
   - Should we continue or abort?

**Proposed Solution:**

```typescript
// In hls-types/src/errors.ts
export class HlsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class ManifestParseError extends HlsError {
  constructor(message: string, public readonly line?: number, cause?: Error) {
    super(message, 'MANIFEST_PARSE_ERROR', { line }, { cause });
  }
}

export class FetchError extends HlsError {
  constructor(
    message: string,
    public readonly url: string,
    public readonly status?: number,
    cause?: Error
  ) {
    super(message, 'FETCH_ERROR', { url, status }, { cause });
  }
  
  get isRetryable(): boolean {
    // 5xx errors, network errors are retryable
    return !this.status || (this.status >= 500 && this.status < 600);
  }
}

export class StorageError extends HlsError {
  constructor(message: string, public readonly path: string, cause?: Error) {
    super(message, 'STORAGE_ERROR', { path }, { cause });
  }
}
```

**Recommendation**: ✅ Add specific error types - improves debugging and error handling - **COMPLETED**

**Status**: ✅ Implemented in `packages/hls-types/src/errors.ts`:
- `HlsError` - Base error class with code and context
- `ManifestParseError` - For parsing failures (includes line number)
- `FetchError` - For HTTP failures (includes URL, status, `isRetryable` property)
- `StorageError` - For storage failures (includes path)
- `TransferError` - For orchestration failures (includes step)
- `ValidationError` - For validation failures (includes field)

All error types are exported from `@mtngtools/hls-types` and integrated into:
- `hls-transfer` (uses `FetchError`)
- `hls-utils` (uses `ValidationError`)

---

## 4. Stream Handling

### Question: Is the stream conversion logic correct for both Web and Node.js streams?

**Current Implementation** (`hls-transfer/src/storage.ts`):

```typescript
// Converts Web ReadableStream to Node.js stream
if (stream && typeof (stream as { getReader?: unknown }).getReader === 'function') {
  const reader = (stream as ReadableStream<Uint8Array>).getReader();
  // ... reads all chunks into memory, then creates Node stream
}
```

**Issues:**

1. **Memory Usage**: Currently reads entire stream into memory before writing
   - Defeats purpose of streaming for large chunks
   - Should pipe directly

2. **Type Safety**: `TransferStream = unknown` is too loose
   - Hard to work with
   - No type checking

3. **Conversion**: No efficient conversion between stream types

**Proposed Solution:**

```typescript
// Better type definition
export type TransferStream = 
  | ReadableStream<Uint8Array>  // Web standard
  | NodeJS.ReadableStream;       // Node.js

// Helper function for conversion
function toNodeStream(stream: TransferStream): NodeJS.ReadableStream {
  if ('getReader' in stream && typeof stream.getReader === 'function') {
    // Web ReadableStream - use stream-web-to-node or similar
    // Or use Node.js 18+ built-in conversion
    return Readable.fromWeb(stream as ReadableStream);
  }
  return stream as NodeJS.ReadableStream;
}
```

**Recommendation**: 
- ✅ Use Node.js 18+ `Readable.fromWeb()` for conversion - **COMPLETED**
- ✅ Improve type definition - **COMPLETED** (TransferStream type defined)
- ⚠️ Test with both stream types - **PENDING** (needs test infrastructure)

---

## 5. Architecture & Dependencies

### Question: Does the package structure make sense? Any concerns about dependencies?

**Current Structure** (✅ Fixed):
- `hls-core` → Only depends on `hls-types` (interfaces)
- `hls-transfer` → Only depends on `hls-types` (implements interfaces)
- `hls-base` → Composes everything

**Remaining Questions:**

1. **How does `hls-core` get implementations?**
   - Answer: Passed in via constructor or method parameters
   - `TransferJob` needs `Fetcher`, `Storage`, `Parser` instances
   - These come from `hls-base` composition layer

2. **Should `hls-core` export a default implementation?**
   - Answer: No - `hls-base` provides defaults
   - `hls-core` is pure orchestration

3. **What about `hls-transfer` depending on `hls-core`?**
   - ✅ Already fixed - removed dependency
   - `hls-transfer` only implements interfaces from `hls-types`

**Recommendation**: ✅ Architecture is correct after fixes

---

## 6. Core Package Implementation Questions

### Question: How should the orchestration pipeline work?

**Key Decisions Needed:**

1. **Pipeline Execution Model**
   - Sequential vs parallel?
   - Answer: Mostly sequential, but chunks can download in parallel
   - Variants can process in parallel after master manifest parsed

2. **Concurrency Control**
   - How to limit concurrent chunk downloads?
   - Answer: Use semaphore/queue pattern
   - Respect `maxConcurrent` from config

3. **Progress Tracking**
   - How granular should progress be?
   - Answer: Overall + per-variant (as specified)
   - Track: variants completed, chunks completed, bytes transferred

4. **Plugin System**
   - How to handle plugin return values?
   - Answer: Plugins can return values to override defaults
   - If plugin returns `undefined`, use default implementation

5. **Error Handling in Pipeline**
   - What happens if step fails?
   - Answer: Call `onError` callback, then either:
     - Continue (skip failed item)
     - Abort (stop entire transfer)
   - Should be configurable

6. **Manifest Path Generation**
   - How to generate destination paths?
   - Answer: Default implementation uses source URL structure
   - Plugin can override for custom path logic

7. **Manifest Content Transformation**
   - Should we rewrite URIs in manifests?
   - Answer: Yes - update chunk URIs to point to destination
   - Default: Preserve relative structure, update base URL

**Recommendation**: ✅ All decisions made and implemented in `hls-core`:
- ✅ Sequential pipeline with parallel chunk downloads
- ✅ Semaphore pattern for concurrency control
- ✅ Overall + per-variant progress tracking
- ✅ Plugin system with override support
- ✅ Error handling with callbacks (continues on failure)
- ✅ Default path generation (preserves source structure)
- ✅ Manifest serialization implemented

---

## 7. Testing Strategy

### Questions:

1. **Test Fixtures**: Where should sample M3U8 files live?
   - Answer: `packages/hls-parser/tests/fixtures/` or root `tests/fixtures/`
   - Need: Master manifest, variant manifest, encrypted chunks

2. **Mock Strategy**: How to mock HTTP requests?
   - Answer: Use `msw` (Mock Service Worker) or `nock`
   - Mock `ofetch` calls

3. **Integration Tests**: What level of integration testing?
   - Answer: 
     - Unit tests per package
     - Integration test: Full transfer with mocked HTTP/storage
     - E2E test: Real transfer (optional, manual)

4. **Edge Cases**: What edge cases to test?
   - Empty manifests
   - Malformed manifests
   - Network failures
   - Storage failures
   - Concurrent download limits
   - Large files (memory pressure)

**Recommendation**: Define test strategy before implementing core

---

## 8. Configuration & Defaults

### Questions:

1. **Default Concurrency**: What should `maxConcurrent` default to?
   - Answer: 5-10 seems reasonable
   - Should be configurable

2. **Default Retry**: What should retry defaults be?
   - Answer: 3 retries, 1s delay (exponential backoff?)

3. **Timeout Defaults**: What should HTTP timeout be?
   - Answer: 30s for manifests, 60s for chunks?

4. **Path Generation**: Default path generation strategy?
   - Answer: Preserve source URL structure
   - Example: `https://cdn1.com/path/master.m3u8` → `/dest/path/master.m3u8`

**Recommendation**: Define sensible defaults, make configurable

---

## Summary of Recommendations

### High Priority (Do Now):
1. ✅ Add specific error types (`HlsError`, `FetchError`, etc.) - **COMPLETED**
2. ✅ Fix stream handling to use `Readable.fromWeb()` (Node.js 18+) - **COMPLETED**
3. ⚠️ Define test strategy and fixtures structure - **PENDING**

### Medium Priority (Do Soon):
1. ✅ Document missing tags (`EXT-X-SKIP`, `EXT-X-GAP`, etc.) - **COMPLETED** (documented in parser spec)
2. ⚠️ Add `EXT-X-SKIP` and `EXT-X-GAP` tag support if needed (when encountered) - **DEFERRED**
3. ⚠️ Define default configuration values - **PARTIALLY DONE** (defaults exist but not documented)
4. ⚠️ Implement error recovery strategy (continue vs abort) - **PARTIALLY DONE** (continues on error, not configurable)

### Low Priority (Defer):
1. ✅ Media group parsing - **DOCUMENTED** in parser spec for future consideration
2. ✅ Playlist reload for live streams - **DOCUMENTED** in parser spec for future consideration
3. ✅ Custom tag preservation - **DOCUMENTED** in parser spec for future consideration

---

## Next Steps

1. ✅ **Review these questions** and decide on answers - **COMPLETED**
2. ✅ **Implement error types** (high priority) - **COMPLETED**
3. ✅ **Fix stream handling** (high priority) - **COMPLETED**
4. ✅ **Start core package implementation** with decisions made above - **COMPLETED**
5. ⚠️ **Set up test infrastructure** with fixtures - **PENDING**
6. ✅ **Implement hls-base package** - **COMPLETED**
7. ✅ **Implement hls-cli package** - **COMPLETED**

## Completed Items

- ✅ Error type hierarchy implemented (`HlsError`, `FetchError`, `StorageError`, etc.)
- ✅ Error types integrated into `hls-transfer` and `hls-utils`
- ✅ Architecture dependencies fixed (`hls-core` only depends on `hls-types`)
- ✅ Stream handling fixed (using `Readable.fromWeb()` for efficient conversion)
- ✅ `hls-core` package implemented (`TransferJobExecutor` with 16-step pipeline)
- ✅ `hls-base` package implemented (`DefaultPipelineExecutor`, `HlsClient`)
- ✅ `hls-cli` package implemented (CLI wrapper with argument parsing)
- ✅ Concurrency control implemented (Semaphore pattern)
- ✅ Progress tracking implemented (overall and per-variant)
- ✅ Retry logic implemented (configurable attempts and delays)
- ✅ Manifest serialization implemented (M3U8 format)
- ✅ Future considerations documented in parser spec:
  - Playlist reload for live streams
  - Custom/unknown tags
  - Additional HLS tags (`EXT-X-MEDIA`, `EXT-X-I-FRAMES-ONLY`, `EXT-X-SKIP`, `EXT-X-DATERANGE`, `EXT-X-GAP`)

