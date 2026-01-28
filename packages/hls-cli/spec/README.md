# HLS CLI Specification

**Package**: `@mtngtools/hls-cli`

## Overview

A thin command-line interface wrapper for the HLS Base library. Its primary purpose is to expose the core functionality to the terminal for manual operations or scripting.

## Requirements

1.  **Thin Wrapper**: The CLI should contain minimal business logic. It should parse command line arguments and pass them directly to the [`@mtngtools/hls-base`](../../hls-base/spec/README.md) functions.
2.  **Default Implementation**: It relies on [`hls-base`](../../hls-base/spec/README.md) to provide the default transfer and storage implementations.
3.  **Configuration**: Must support loading configuration via flags or a config file.

## Alternatives Considered

-   **Direct dependence on Core**: Rejected because CLI users typically want a " batteries included" experience which [`hls-base`](../../hls-base/spec/README.md) provides.
