# HLS Monorepo Specification

This document outlines the high-level architecture and goals for the HLS (HTTP Live Streaming) utilities monorepo.

## Project Overview

The goal is to build a comprehensive set of utilities for HLS content management, primarily focused on server-side operations.

### Key Use Cases
1.  **CDN-to-CDN Transfer**: efficiently moving HLS content between storage locations while managing headers, authentication, and directory structure.
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

1.  **Orchestration (Core)** (`@mtngtools/hls-core`) - [Spec](../packages/hls-core/spec/README.md)
    *   Define the central orchestration logic and types.
    *   *Includes:* Core interfaces and shared types from `@mtngtools/hls-types`.

2.  **Transfer (Fetch)** (`@mtngtools/hls-transfer`) - [Spec](../packages/hls-transfer/spec/README.md)
    *   Implement content fetching (Manifests).
    *   *Rationale:* Fetching must happen before parsing.

3.  **Parsing** (`@mtngtools/hls-parser`) - [Spec](../packages/hls-parser/spec/README.md)
    *   Implement parsing logic.
    *   *Strategy:* Focus on common elements first (Master/Variant). Advanced parsing features added later.

4.  **Composition (Base)** (`@mtngtools/hls-base`) - [Spec](../packages/hls-base/spec/README.md)
    *   Compose Core, Transfer, and Parser into a default client.

5.  **CLI** (`@mtngtools/hls-cli`) - [Spec](../packages/hls-cli/spec/README.md)
    *   Interface layer.

6.  **Types** (`@mtngtools/hls-types`) - [Spec](../packages/hls-types/spec/README.md)
    *   *Note:* Shared type definitions (foundation for all other packages).

7.  **Utilities** (`@mtngtools/hls-utils`) - [Spec](../packages/hls-utils/spec/README.md)
    *   Extracted ONLY as needed.
    *   *Strategy:* Packages maintain their own utils initially. Shared utils are created only when multiple packages require the same functionality.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    @mtngtools/hls-types                  │
│              (Foundation - All Interfaces)               │
└─────────────────────────────────────────────────────────┘
        │              │              │              │
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ hls-utils    │ │ hls-parser   │ │ hls-transfer │ │  hls-core    │
│ (Utilities)  │ │ (Parser)     │ │ (Fetch/Store)│ │(Orchestration)│
│              │ │              │ │              │ │              │
│ Implements:  │ │ Implements:  │ │ Implements:  │ │ Uses only:   │
│ (none)       │ │ Parser       │ │ Fetcher       │ │ Interfaces   │
│              │ │              │ │ Storage       │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        │              │              │              │
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                                      │
                                      ▼
                            ┌──────────────┐
                            │  hls-base    │
                            │ (Composition)│
                            │              │
                            │ Wires:       │
                            │ - Parser     │
                            │ - Fetcher    │
                            │ - Storage    │
                            │ into Core    │
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

