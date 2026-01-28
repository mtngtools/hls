# HLS CLI Specification

**Package**: `@mtngtools/hls-cli`

## Overview

A thin command-line interface wrapper for the HLS Core library. Its primary purpose is to expose the core functionality to the terminal for manual operations or scripting.

## Requirements

1.  **Thin Wrapper**: The CLI should contain minimal business logic. It should parse command line arguments and pass them directly to the `@mtngtools/hls-core` functions.
2.  **Minimal Dependencies**: Should not pull in heavy UI libraries if possible.
3.  **Configuration**: Must support loading configuration (headers, auth tokens) via flags or a config file.

## Alternatives Considered

- **Heavy CLI with separate logic**: Considered building unique features into the CLI. Rejected to ensure the Core library remains the single source of truth for functionality, making it reusable in other non-CLI contexts (e.g., a web server).
