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

234.  **Orchestration Pipeline**:
    *  These steps represent the lifecycle of a transfer job:
    *   **Step 1: Fetch Master Manifest**: `(url, context) => Promise<Response>`        
    *   **Step 2: Parse Master Manifest**: `(content, context) => Promise<MasterManifest>`
    *   **Step 4: Filter Variants**: `(context) => Promise<Variant[]>`
    *   **Step 5: Fetch Variant Manifest**: `(variant, context) => Promise<Response>`
        *   **Requirement**: If `variant.uri` is an absolute URL, it MUST be used as-is, ignoring the master manifest base URL.
    *   **Step 6: Parse Variant Manifest**: `(content, variant, context) => Promise<VariantManifest>`
    *   **Step 7: Chunk Discovery**: `(manifest, variant, context) => Promise<Chunk[]>`
    *   **Step 8: Filter Chunks**: `(manifest, variant, chunks, context) => Promise<Chunk[]>`
    *   **Step 9: Create Destination Master Manifest**: `(context) => Promise<string>`
        *   **Requirement**: The generated manifest must rewritten to reference the new destination paths of the variants (e.g., using relative paths to subfolders).
    *   **Step 10: Generate Master Manifest Path**: `(sourcePath, manifest, context) => Promise<string>`
    *   **Step 11: Store Master Manifest**: `(manifest, path, context) => Promise<void>`
        * Use at this step for `MasterManifest` (and later for `VariantManifest`).
        * **Default behavior**: Store a copy of the raw source manifest content to a companion path.
        * **Path convention**: `{path}.source.txt`.
    *   **Step 12: Create Destination Variant Manifest**: `(chunks, variant, context) => Promise<string>`
        *   **Requirement**: The generated manifest must be rewritten to reference the new destination filenames of the chunks (standardized names).
    *   **Step 13: Generate Variant Manifest Path**: `(sourcePath, variant, context) => Promise<string>`
        *   **Requirement**: If the variant source was an absolute URL, or if there is a risk of filename collision, the destination path SHOULD use a subfolder structure (e.g., `/{bandwidth}/index.m3u8` or similar) to ensure uniqueness.
    *   **Step 14: Download Chunk**: `(chunk, context) => Promise<Stream>`
        *   **Requirement**: If `chunk.uri` is an absolute URL, it MUST be used as-is.
    *   **Step 15: Generate Chunk Path**: `(sourcePath, variant, manifest, chunk, context) => Promise<string>`
        *   **Requirement**: Chunk filenames MUST be simple and clean.
            *   If the source URL contains a filename like `{number}.ts`, use it (ignoring query parameters).
            *   Otherwise, generate a simple name using the chunk's index in the manifest (e.g., `0.ts`, `1.ts`).
            *   Query parameters MUST be ignored for the filename.
            *   Filenames MUST be unique across the transfer job (achieved via subfolders per variant).
    *   **Step 16: Store Chunk**: `(stream, path, chunk, context) => Promise<void>`
    *   **Step 17: Finalize**: `(context) => Promise<void>`
