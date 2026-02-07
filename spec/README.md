# HLS Monorepo Specification

This document outlines the high-level architecture and goals for the HLS (HTTP Live Streaming) utilities monorepo.

## Project Overview

The goal is to build a comprehensive set of utilities for HLS content management, primarily focused on server-side operations.

### Key Use Cases
1.  **CDN-to-CDN Transfer**: efficiently moving HLS content between storage locations while managing headers, authentication, and directory structure. By default, a copy of the raw source manifest (main and variant) is stored alongside the transformed destination manifest for audit, debugging, and comparison. Path convention: `{manifestPath}.source.txt`.
2.  **HLS conversion**: Merging HLS segments into single files (future scope).

## Technology Stack

- **Language**: TypeScript
- **Runtime Target**: Node.js (primary), designed for future Edge compatibility (Cloudflare Workers, Deno, Bun).
- **Core Libraries**:
    - `ofetch`: Universal HTTP client for robust fetching (retries, timeouts).
- **Tooling**:
    - **Build**: Turbo
    - **Test**: Vitest
    - **Lint**: oxlint
    - **Package Manager**: pnpm

## Packages

The following packages are listed in their build priority order, which aligns with the application's execution flow:

1.  **Orchestration (Core)** (`@mtngtools/utils-hls-core`) - [Spec](../packages/utils-hls-core/spec/README.md)
    *   Define the central orchestration logic and types.
    *   *Includes:* Core interfaces and shared types from `@mtngtools/utils-hls-types`.

2.  **Transfer (Fetch)** (`@mtngtools/frame-hls-transfer`) - [Spec](../packages/frame-hls-transfer/spec/README.md)
    *   Implement content fetching (Manifests).
    *   *Rationale:* Fetching must happen before parsing.

3.  **Parsing** (`@mtngtools/utils-hls-parser`) - [Spec](../packages/utils-hls-parser/spec/README.md)
    *   Implement parsing logic.
    *   *Strategy:* Focus on common elements first (Main/Variant). Advanced parsing features added later.

4.  **Composition (Base)** (`@mtngtools/frame-hls-base`) - [Spec](../packages/frame-hls-base/spec/README.md)
    *   Compose Core, Transfer, and Parser into a default client.

5.  **CLI** (`@mtngtools/frame-hls-cli`) - [Spec](../packages/frame-hls-cli/spec/README.md)
    *   Basic interface layer (no custom transfer options; not actively developed).

6.  **Types** (`@mtngtools/utils-hls-types`) - [Spec](../packages/utils-hls-types/spec/README.md)
    *   *Note:* Shared type definitions (foundation for all other packages).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                @mtngtools/utils-hls-types               │
│              (Foundation - All Interfaces)               │
└─────────────────────────────────────────────────────────┘
        │              │              │              │
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ utils-hls-parser │ │ frame-hls-transfer│ │ utils-hls-core   │
│ (Parser)         │ │ (Fetch/Store)     │ │ (Orchestration)  │
│ Implements:      │ │ Implements:       │ │ Uses only:       │
│ Parser           │ │ Fetcher, Storage  │ │ Interfaces       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │              │              │
        │              │              │
        └──────────────┴──────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │ frame-hls-base   │
                            │ (Composition)    │
                            │ Wires: Parser,   │
                            │ Fetcher, Storage │
                            │ into Core        │
                            └──────────────────┘
                                      │
                                      ▼
                            ┌───────────────┐
                            │ frame-hls-cli │
                            │  (CLI Tool)   │
                            └───────────────┘
```

**Dependency Flow**:
1. `utils-hls-types` → No dependencies (foundation - defines all interfaces)
2. `utils-hls-parser` → Depends on `utils-hls-types` (implements `Parser` interface)
3. `frame-hls-transfer` → Depends on `utils-hls-types` (implements `Fetcher` and `Storage` interfaces)
4. `utils-hls-core` → Depends only on `utils-hls-types` (uses interfaces, no concrete implementations)
5. `frame-hls-base` → Depends on `utils-hls-core`, `frame-hls-transfer`, `utils-hls-parser` (composes all implementations)
6. `frame-hls-cli` → Depends on `frame-hls-base` (basic CLI; not actively developed; no custom transfer options)

The project follows a monorepo structure to organize core logic and interface layers.

## Alternatives Considered

- **Polyrepo Structure**: Considered splitting every package into its own repository. Rejected to facilitate easier coordination between core components during early development.
- **Existing `m3u8-parser`**: Rejected due to heavy dependencies (Babel runtime, global polyfills) in favor of a lightweight, zero-dependency custom parser.

## Future Work

### MP4 Conversion
A future goal is to implement HLS to MP4 conversion.
- **Requirements**: Download HLS files locally and merge segments into a continuous MP4.
- **Scope**: Separate repository (`@mtngtools/hls-converter`) due to potential heavy dependencies (muxing libraries).
- **Options**: Support merging all variants or just the highest quality.

