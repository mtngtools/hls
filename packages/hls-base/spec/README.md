# HLS Base Specification

**Package**: `@mtngtools/hls-base`

## Overview

This package acts as the default entry point for most consumers. It combines the orchestration logic from [`@mtngtools/hls-core`](../../hls-core/spec/README.md) with the concrete implementations from [`@mtngtools/hls-transfer`](../../hls-transfer/spec/README.md) and default parsing via [`@mtngtools/hls-parser`](../../hls-parser/spec/README.md).

## Requirements

1.  **Default Composition**:
    -   Provide a `HlsClient` (or similar) that comes pre-configured with `ofetch` fetching and filesystem storage.
    -   Allow overriding specific components while keeping others default.

2.  **Ease of Use**:
    -   "Batteries included" experience.

## Default Manifest Storage Behavior

- **storeManifest**: The default implementation stores two files:
  1. **Destination manifest** at `path` — Serialized M3U8 (transformed for destination URIs).
  2. **Source manifest copy** at `{path}.source.txt` — Raw M3U8 from `manifest.sourceContent` (unchanged).
- **Source content**: Read from `manifest.sourceContent`. If missing, skip the source copy.
- **Path convention**: `{path}.source.txt` (e.g., `./out/main.m3u8` → `./out/main.m3u8.source.txt`).
- **Plugin override**: Plugins may override `storeManifest` to change path convention, disable source copy, or use a different strategy.

### Master Manifest Naming
- The master manifest is named `main.m3u8` by default, regardless of the source filename, to provide a standardized entry point.
- The original source filename is ignored unless a plugin overrides this behavior.

## Implementation Details

### Variant Organization
- Variants are organized into subfolders based on their bandwidth to avoid filename collisions and support absolute source URLs.
- **Pattern**: `{bandwidth}/index.m3u8` (e.g., `2000000/index.m3u8`).
- If multiple variants share the same bandwidth, the implementation handles this (though currently assumes unique bandwidths for simplicity).

### Chunk Naming
- Chunk filenames are standardized to ensure simplicity and avoid issues with long URLs or query parameters.
- **Strategy**:
  1. Strip query parameters.
  2. If the basename matches `{number}.ts`, use it.
  3. Otherwise, use `{index}.ts` based on the chunk's position in the variant manifest.

### Fetcher Behavior
- The default `OfetchFetcher` includes specific handling for `Blob` responses to ensure binary data (like TS chunks) is correctly converted to `ArrayBuffer` for storage.
