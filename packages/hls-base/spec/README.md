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
- **Path convention**: `{path}.source.txt` (e.g., `./out/master.m3u8` → `./out/master.m3u8.source.txt`).
- **Plugin override**: Plugins may override `storeManifest` to change path convention, disable source copy, or use a different strategy.
