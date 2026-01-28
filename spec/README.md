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

## Architecture

The project follows a monorepo structure to organize core logic and interface layers.

### Packages
- **`@mtngtools/hls-core`**: The central library containing all transfer logic, parsing, and orchestration.
- **`@mtngtools/hls-cli`**: A thin command-line wrapper around the core library.
- **`@mtngtools/hls-parser`**: A lightweight, custom M3U8 parser.
- **`@mtngtools/hls-types`**: Shared type definitions.

## Alternatives Considered

- **Polyrepo Structure**: Considered splitting every package into its own repository. Rejected to facilitate easier coordination between core components during early development.
- **Existing `m3u8-parser`**: Rejected due to heavy dependencies (Babel runtime, global polyfills) in favor of a lightweight, zero-dependency custom parser.

## Future Work

### MP4 Conversion
A future goal is to implement HLS to MP4 conversion.
- **Requirements**: Download HLS files locally and merge segments into a continuous MP4.
- **Scope**: Separate repository (`@mtngtools/hls-converter`) due to potential heavy dependencies (muxing libraries).
- **Options**: Support merging all variants or just the highest quality.

