# HLS Core Specification

**Package**: `@mtngtools/hls-core`

## Overview

This package is the pure orchestration layer for HLS operations. It defines the flow of data and the interfaces required for transfer, but does not contain valid implementations for network or disk I/O. It orchestrates `Fetcher`, [`Parser`](../../hls-parser/spec/README.md), [`Transfer`](../../hls-transfer/spec/README.md), and `Storage` components.

## Requirements

1. **TransferJob**
    * `transferConfig`
        * both `source` and `destination` have 
            * `config`: from config types defined in [`Transfer`](../../hls-transfer/spec/README.md)
            * `concurrency`: 
                * `maxConcurrent`
                * `maxConcurrentPerDomain` (planned for future only)
            * `retry`: Control `maxRetries` and `retryDelay`.
    * `plugins`: allows overriding any step of the multi-step pipeline.
    * `options`
        * `onOverallProgress`
        * `onVariantProgress`
        * `onError`
    * Move chunks from source to destination using streams to minimize memory use.

2.  **Transfer Context (`Context`)**:
    *   Accept and maintain a request state.
    *   Hold configuration.
    *   `masterManifest` (once it's available)
    *   `filteredVariants` (once it's available)
    *   Support arbitrary metadata storage.
    *   *Note*: Progress is tracked via callbacks, not stored in the context state.

2.  **Orchestration Pipeline**:
    *  These steps represent the lifecycle of a transfer job:
    *   **Step 1: Fetch Master Manifest**: `(url, context) => Promise<Response>`        
    *   **Step 2: Parse Master Manifest**: `(content, context) => Promise<MasterManifest>`
    *   **Step 4: Filter Variants**: `(context) => Promise<Variant[]>`
    *   **Step 5: Fetch Variant Manifest**: `(variant, context) => Promise<Response>`
    *   **Step 5: Parse Variant Manifest**: `(content, variant, context) => Promise<VariantManifest>`
    *   **Step 6: Chunk Discovery**: `(manifest, variant, context) => Promise<Chunk[]>`
    *   **Step 7: Chunk Filter**: `(manifest, variant, chunks, context) => Promise<Chunk[]>`
    *   **Step 8: Create Destination Master Manifest**: `(context) => Promise<string>`
    *   **Step 9: Generate Master Manifest Path**: `(sourcePath, manifest, context) => Promise<string>`
    *   **Step 10: Store Manifest**: `(manifest, path, context) => Promise<void>`
        * Use at this step for `MasterManifest` and between 12 and 13 for `VariantManifest`
        * **Default behavior**: When storing the destination manifest at `path`, the pipeline MUST also store a copy of the raw source manifest content to a companion path.
        * **Path convention**: `{path}.source.txt` (e.g., `master.m3u8` → `master.m3u8.source.txt`, `variant1.m3u8` → `variant1.m3u8.source.txt`).
        * **Source content**: Read from `manifest.sourceContent` (populated by parser). If missing, skip the source copy (e.g., when a plugin provides a manifest without sourceContent).
        * **Configurability**: This is default behavior; plugins may override `storeManifest` to change or disable it.
    *   **Step 11: Create Destination Variant Manifest**: `(chunks, variant, context) => Promise<string>`
    *   **Step 12: Generate Master Manifest Path**: `(sourcePath, manifest, context) => Promise<string>`
    *   **Step 12: Download Chunk**: `(chunk, context) => Promise<Stream>`
    *   **Step 13: Generate Chunk Path**: `(sourcePath, variant, chunk, context) => Promise<string>`
    *   **Step 14: Store Chunk**: `(stream, path, chunk, context) => Promise<void>`
    *   **Step 15: Finalize**: `(context) => Promise<void>` (Hook for logging, notifications, or post-processing like MP4 muxing).
