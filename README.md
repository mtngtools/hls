# @mtngtools/hls

HLS (HTTP Live Streaming) utilities monorepo for managing HLS content.

## Overview

This monorepo contains TypeScript utilities for working with HLS content, including:

- Manifest parsing and validation
- CDN-to-CDN content transfer with plugin system
- HLS to MP4 conversion
- And more...

## Packages

- `@mtngtools/hls-types` - Core types and interfaces
- `@mtngtools/hls-parser` - HLS manifest parser
- `@mtngtools/hls-core` - Transfer pipeline with plugin system
- `@mtngtools/hls-utils` - Common utilities
- `@mtngtools/hls-cli` - CLI tools

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

See [spec/README.md](./spec/README.md) for detailed specifications, architecture decisions, and planning documentation.

## License

MIT

