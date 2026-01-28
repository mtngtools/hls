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
