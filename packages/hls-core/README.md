# @mtngtools/hls-core

Core HLS transfer logic and pipeline orchestration.

## Overview

Central package for moving HLS content between CDNs with a flexible plugin system for customization. This package orchestrates defaults and logic used by consumers like the CLI.

## Installation

```bash
pnpm add @mtngtools/hls-core
```

## Usage

```typescript
import { transfer } from '@mtngtools/hls-core';
```

## Features

- 12 granular, overridable transfer steps
- Plugin system for customization
- HTTP header management
- Cookie/token forwarding
- Concurrency control
- Progress tracking
- Streaming download-to-upload

## Specifications
  
See [Specification Details](./spec/README.md) for detailed specifications.

## License

MIT

