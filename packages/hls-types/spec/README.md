# HLS Types Specification

**Package**: `@mtngtools/hls-types`

## Overview

This package serves as the single source of truth for TypeScript interfaces and types used across the monorepo. It ensures consistency in data structures between the parser, core logic, and plugins.

## Requirements

1.  **Manifest Interfaces**:
    - `MasterManifest`: Structure representing a master playlist.
    - `Variant`: Structure representing a variant stream.
    - `MediaPlaylist`: Structure representing a media playlist.
    - `Segment`: Structure representing a media segment/chunk.
2.  **Configuration Interfaces**:
    - `SourceConfig`: Configuration for the source (URL, fetch options).
    - `TransferConfig`: Configuration for the transfer job.
3.  **Plugin Interfaces**:
    - Definitions for all lifecycle hooks (fetch, parse, store).

## Alternatives Considered

- **Co-locating types with code**: Considered keeping types in their respective packages. Rejected to prevent circular dependencies and allow packages (like the CLI or Plugins) to depend solely on types without pulling in implementation code.
