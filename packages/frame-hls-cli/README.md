# @mtngtools/frame-hls-cli

Basic, transfer-agnostic CLI for HLS operations.

## Overview

Command-line interface for common HLS transfer operations using the default implementations (HTTP fetch + local filesystem). This is a **basic CLI**. 

**Note:** This package is **not actively developed**. For custom transfer options (e.g. `provide-hls-aws`), use the `compose-hls-cli` package which composes `frame-hls-base` with provider packages.

## Installation

```bash
pnpm add -g @mtngtools/frame-hls-cli
```

## Usage

```bash
hls-base transfer --source <url> --destination <path>
```

## Features

- Unified CLI interface
- Common HLS transfer (source URL → local path)
- Integration with frame-hls-base defaults

## Specifications

See [Specification Details](./spec/README.md) for detailed specifications.

## License

MIT
