# @mtngtools/hls

HLS (HTTP Live Streaming) utilities monorepo for managing HLS content.

## Overview

This monorepo contains TypeScript utilities for working with HLS content, including:

- Manifest parsing and validation
- CDN-to-CDN content transfer with plugin system
    - Via oFetch 
    - Supporting custom transfer plugin
- HLS to MP4 conversion (planned)


## Packages

- `@mtngtools/utils-hls-types` - Core types and interfaces
- `@mtngtools/utils-hls-parser` - HLS manifest parser
- `@mtngtools/utils-hls-core` - Transfer pipeline with plugin system
- `@mtngtools/frame-hls-transfer` - HLS transfer (fetch, storage)
- `@mtngtools/frame-hls-base` - Default HLS client (Core + Transfer + Parser)
- `@mtngtools/frame-hls-cli` - Basic CLI (no custom transfer options; not actively developed)

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Type check
pnpm run typecheck

# Lint
pnpm run lint
```

## Development

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turbo](https://turbo.build/).

## Project Management

Project management in organization-level github project: https://github.com/orgs/mtngtools/projects/1

## Specifications & Planning

See [Specification Details](./spec/README.md) for detailed specifications, architecture decisions, and planning documentation.

## License

MIT

