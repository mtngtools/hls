# @mtngtools/hls-transfer

CDN-to-CDN HLS content transfer with plugin system.

## Overview

Transfer pipeline for moving HLS content between CDNs with a flexible plugin system for customization.

## Installation

```bash
pnpm add @mtngtools/hls-transfer
```

## Usage

```typescript
import { transfer } from '@mtngtools/hls-transfer';
```

## Features

- 12 granular, overridable transfer steps
- Plugin system for customization
- HTTP header management
- Cookie/token forwarding
- Concurrency control
- Progress tracking
- Streaming download-to-upload

## License

MIT

