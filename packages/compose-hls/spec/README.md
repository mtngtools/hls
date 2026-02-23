# compose-hls

**Package**: `@mtngtools/compose-hls`

## Overview

This package composes `frame-hls-base` and extends it with built-in, out-of-the-box support for accepting an AWS S3 bucket as an HLS transfer destination. 

It bridges core capabilities of base utilities and AWS-specific logic without injecting AWS dependencies into the fundamental classes.

## Architecture

*   **Setup**: It will act as a drop-in replacement or wrapper for `frame-hls-base` functions.
*   **Composition Setup**: Leverages transfer orchestration, chunk filtering, and manifest parsing logic identically from `frame-hls-base`.
*   **Extended Capabilities**: Automatically provisions an `AwsS3Storage` (from `provide-hls-aws`) when detecting `s3://` specific destination configurations, or similarly explicitly requested S3 destinations.
    *   **Auto-Verification**: Injects the `AwsS3ChunkVerificationPlugin` during the `verifyChunks` pipeline step when S3 destinations are used, automatically confirming transferred chunks against the S3 `listObjectsV2` API. This behavior can be disabled natively by setting `autoVerifyChunks: false` in the destination config.

## Usage

Allows developers composing transfer pipelines to seamlessly pass their S3 configuration requirements and execute a transfer job identically to how they would utilizing pure file system execution.

### `transferToS3` Helper API

The `transferToS3` function provides a simplified way to execute a standard transfer to an S3 destination without needing to manually construct the `ComposeHlsClient` and `TransferJobExecutor` objects.

```typescript
import { transferToS3 } from '@mtngtools/compose-hls';

await transferToS3({
    sourceM3u8Path: 'https://example.com/master.m3u8',
    mediaDestination: {
        bucket: 'my-media-bucket',
        storagePrefix: 'hls-output',
        subPath: 'video123',
        m3u8Name: 'index'
    },
    verificationDestination: {
        bucket: 'my-status-bucket',
        storagePrefix: 'status-logs',
        subPath: 'video123-status'
    }
});
```

- **`sourceM3u8Path`**: The URL to the source M3U8 manifest.
- **`mediaDestination`**: Configuration for where the HLS media files will be saved.
  - Generates the path `s3://[bucket]/[storagePrefix]/[subPath]/[m3u8Name].m3u8`.
  - `autoVerifyChunks` is enabled implicitly when using S3 verification.
- **`verificationDestination`**: (Optional) Configuration for saving the JSON transfer status outputs via `JsonProgressTracker` and `AwsS3Storage`. If omitted, external chunk verification tracking is disabled. Accepts `storagePrefix` and `subPath` similarly to target destination.
