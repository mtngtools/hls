# HLS Core Specification

**Package**: `@mtngtools/utils-hls-core`

## Overview

This package is the pure orchestration layer for HLS operations. It defines the flow of data and the interfaces required for transfer, but does not contain valid implementations for network or disk I/O. It orchestrates `Fetcher`, [`Parser`](../../utils-hls-parser/spec/README.md), [`Transfer`](../../frame-hls-transfer/spec/README.md), and `Storage` components.

## Requirements

1. **TransferJob**
    * `transferConfig`
        * both `source` and `destination` have 
            * `config`: from config types defined in [`Transfer`](../../frame-hls-transfer/spec/README.md)
            * `concurrency`: 
                * `maxConcurrent`
                * `maxConcurrentPerDomain` (planned for future only)
            * `retry`: Control `maxRetries` and `retryDelay`.
    * `plugins`: allows overriding any step of the multi-step pipeline.
        * `verifyChunks` (optional): A bulk verification callback run just before writing the final status.json. Useful for validating written chunks (e.g., via `listObjectsV2` in AWS S3) all at once to minimize API calls.
    * `options`
        * `onOverallProgress`
        * `onVariantProgress`
        * `onError`
    * Move chunks from source to destination using streams to minimize memory use.

2.  **Transfer Context (`Context`)**:
    *   Accept and maintain a request state.
    *   Hold configuration.
    *   `mainManifest` (once it's available)
    *   `filteredVariants` (once it's available)
    *   Support arbitrary metadata storage.
    *   *Note*: Progress is tracked via callbacks, not stored in the context state.

234.  **Orchestration Pipeline**:
    *  These steps represent the lifecycle of a transfer job:
    *   **Step 1: Fetch Main Manifest**: `(url, context) => Promise<Response>`        
    *   **Step 2: Parse Main Manifest**: `(content, context) => Promise<MainManifest>`
    *   **Step 4: Filter Variants**: `(context) => Promise<Variant[]>`
    *   **Step 5: Fetch Variant Manifest**: `(variant, context) => Promise<Response>`
        *   **Requirement**: If `variant.uri` is an absolute URL, it MUST be used as-is, ignoring the main manifest base URL.
    *   **Step 6: Parse Variant Manifest**: `(content, variant, context) => Promise<VariantManifest>`
    *   **Step 7: Chunk Discovery**: `(manifest, variant, context) => Promise<Chunk[]>`
    *   **Step 8: Filter Chunks**: `(manifest, variant, chunks, context) => Promise<Chunk[]>`
    *   **Step 9: Create Destination Main Manifest**: `(context) => Promise<string>`
        *   **Requirement**: The generated manifest must rewritten to reference the new destination paths of the variants (e.g., using relative paths to subfolders).
    *   **Step 10: Generate Main Manifest Path**: `(sourcePath, manifest, context) => Promise<string>`
    *   **Step 11: Store Main Manifest**: `(manifest, path, context) => Promise<void>`
        * Use at this step for `MainManifest` (and later for `VariantManifest`).
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
    *   **Step 17: Verify Chunks (Optional)**: `(summary, variantProgresses, context) => Promise<void>`
        *   **Requirement**: A plugin hook intended for bulk verification (e.g., calling `listObjectsV2` on a variant directory to verify file sizes). If implemented, the plugin updates `verifiedWrittenBytes` on the progress objects and optionally attaches raw validation payload arrays to `verificationSources`.
    *   **Step 18: Finalize**: `(context) => Promise<void>`

## Progress Tracking

The orchestration layer supports a `transfer-progress` pluggable tracking system designed to monitor and serialize chunk transfer statuses. 

### JSON Tracker File Structure

When a JSON progress tracker is utilized (e.g., `JsonProgressTracker`), it will write `.json` files to a specified `Storage` interface. The tracker maintains a high-level `status.json` and individual detailed `status.json` files for each variant, storing intermittent updates in an `interim/` directory during the transfer.

```
{basePath}/
  └── {timestamp}-job/            # e.g. 2026-02-21T23-10-05Z-job/
      ├── status.json             # High-level summary (updated iteratively, final moved here)
      ├── 720p/
      │   └── status.json         # Final variant chunk status
      └── interim/
          ├── status.json         # Interim high-level summary
          └── 720p/
              └── status.json     # Interim variant chunk status (updated e.g. every 10%)
```

### JSON Payload Schemas

#### High-Level `status.json`

The top-level summary provides an overview of the entire job without the weight of thousands of chunk keys:

```json
{
  "totalChunks": 1000,
  "completedChunks": 100,
  "failedChunks": 0,
  "totalExpectedBytes": 104857600,
  "totalWrittenBytes": 10485760,
  "verifiedWrittenBytes": 10485760,
  "variants": {
    "720p": {
      "totalChunks": 500,
      "completedChunks": 50,
      "failedChunks": 0,
      "totalExpectedBytes": 52428800,
      "totalWrittenBytes": 5242880,
      "verifiedWrittenBytes": 5242880
    },
    "1080p": {
      "totalChunks": 500,
      "completedChunks": 50,
      "failedChunks": 0,
      "totalExpectedBytes": 52428800,
      "totalWrittenBytes": 5242880,
      "verifiedWrittenBytes": 5242880
    }
  }
}
```

#### Variant-Level `{variant}/status.json`

The variant-specific files contain the detailed chunk transfer dictionary for that specific variant:

```json
{
  "variantPath": "720p",
  "totalChunks": 500,
  "completedChunks": 50,
  "failedChunks": 0,
  "totalExpectedBytes": 52428800,
  "totalWrittenBytes": 5242880,
  "verifiedWrittenBytes": 5242880,
  "verificationSources": [
    {
      "IsTruncated": false,
      "Contents": [
        {
          "Key": "test-hls-e2e-1234/my-transfer/720p/000.ts",
          "Size": 1048576
        }
      ]
    }
  ],
  "chunks": {
    "000.ts": {
      "expectedBytes": 1048576,
      "writtenBytes": 1048576,
      "verifiedWrittenBytes": 1048576,
      "success": true
    },
    "001.ts": {
      "expectedBytes": 1048576,
      "writtenBytes": 2048,
      "success": false,
      "errorCode": "ECONNRESET"
    }
  }
}
```

- `chunks`: A dictionary of status objects, keyed by the chunk's filename (`000.ts`) relative to the variant folder.
- `expectedBytes`: The derived size from the `Content-Length` response header.
- `writtenBytes`: The actual bytes piped to the destination storage.
- `verifiedWrittenBytes`: (Optional) The verified size derived from a bulk post-transfer check (e.g. S3 `listObjectsV2`).
- `verificationSources`: (Optional) An array (`any[]`) of raw response payloads directly from the bulk verification plugin, stored without manipulation (e.g., an array of S3 `ListObjectsV2CommandOutput` objects including response metadata). Written only to the variant's final status file, not interim progress updates.
- `success`: A boolean indicating if the chunk successfully transferred.
- `errorCode`: An optional short string (e.g., `Timeout`, `StorageError`) if `success` is false.
