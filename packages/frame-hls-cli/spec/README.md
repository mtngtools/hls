# HLS CLI Specification

**Package**: `@mtngtools/frame-hls-cli`

**Note:** This is a **basic CLI**. It is **not actively developed**. For provider-specific transfers, use the `compose-hls-cli` package which composes `frame-hls-base` with packages such as `provide-hls-aws`.

## Overview

A thin command-line interface wrapper for the HLS Base library. Its primary purpose is to expose the core functionality to the terminal for manual operations or scripting using default implementations only (no custom transfer/storage plugins).

## Requirements

1.  **Thin Wrapper**: The CLI should contain minimal business logic. It should parse command line arguments and pass them directly to the [`@mtngtools/frame-hls-base`](../../frame-hls-base/spec/README.md) functions.
2.  **Default Implementation**: It relies on [`frame-hls-base`](../../frame-hls-base/spec/README.md) to provide the default transfer and storage implementations.
3.  **Configuration**: Must support loading configuration via flags or a config file.

## Default Configuration Values

The CLI provides sensible defaults for all configuration options. These defaults are used when values are not specified via command-line arguments or configuration files:

### Source Configuration Defaults
- **Timeout**: `30000` milliseconds (30 seconds) for HTTP requests
- **Max Concurrent Downloads**: `5` parallel chunk downloads
- **Max Retries**: `3` retry attempts for failed requests
- **Retry Delay**: `1000` milliseconds (1 second) between retry attempts

### Destination Configuration Defaults
- **Timeout**: `30000` milliseconds (30 seconds) for HTTP requests (when using `fetch` mode)
- **Max Concurrent Uploads**: `5` parallel chunk uploads (when using `fetch` mode)
- **Max Retries**: `3` retry attempts for failed uploads
- **Retry Delay**: `1000` milliseconds (1 second) between retry attempts

### Error Recovery Strategy

The transfer job continues processing remaining variants and chunks when individual items fail. Failed items are reported via the `onError` callback, but the transfer does not abort unless a critical error occurs (e.g., main manifest fetch failure).

**Note**: Error recovery behavior (continue vs abort) is currently not configurable and defaults to "continue on error". This may be made configurable in future versions.

## Alternatives Considered

-   **Direct dependence on Core**: Rejected because CLI users typically want a " batteries included" experience which [`frame-hls-base`](../../frame-hls-base/spec/README.md) provides.
