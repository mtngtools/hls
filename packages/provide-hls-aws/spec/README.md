# provide-hls-aws

**Package**: `@mtngtools/provide-hls-aws`

## Overview

This package implements custom HLS transfer capabilities for storing objects in AWS S3. It uses the native `@aws-sdk/client-s3` (`S3Client`, `PutObjectCommand`) to ensure maximum transfer speed and accurate byte tracking, rather than relying on unstorage. 

It is designed to be utilized as the `Storage` dependency for HLS chunks and status `json` files.

## Configuration & Interfaces

The options interface aligns with `mtng-unstorage`'s S3 configuration to ensure consistency across the mono repo. For now, this interface is duplicated here, though it may be extracted into a common libraries repo later.

```typescript
import { S3Client } from '@aws-sdk/client-s3';

export interface AwsRegionAndCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;
}

export interface AwsS3StorageOptions extends AwsRegionAndCredentials {
  s3Client?: S3Client;
  bucket: string;
  storagePrefix?: string;
  /**
   * Whether to automatically attach the AwsS3ChunkVerificationPlugin to the transfer.
   * Note: This only applies when this storage options object is configuring the Destination
   * where the actual media chunks are written. It does not apply when these options are
   * used solely to configure the status/progress tracker JSON storage.
   * Defaults to true.
   */
  autoVerifyChunks?: boolean;
}
```

## Implementations

### `AwsS3Storage`
Implements the `Storage` interface from `@mtngtools/utils-hls-types`.
*   `store(stream: TransferStream, path: string, context: TransferContext): Promise<number>`
*   **Note**: The `path` parameter passed to `store` will be joined with the `storagePrefix` (if configured) when generating the final S3 object key.
*   Streams Native Node Streams / WebStreams successfully via `aws-sdk` `PutObjectCommand`. Returns tracked `bytesWritten` efficiently for progress tracking APIs.

### `AwsS3ChunkVerificationPlugin`
An optional plugin that hooks into the core orchestration's `verifyChunks` step.
* **Goal**: Bulk verify the exact bytes written to S3 before finalizing the job, minimizing API calls.
* **Mechanism**: When `verifyChunks` fires, it iterates through each `VariantTransferProgress` and executes an AWS S3 `ListObjectsV2Command` scoped to that specific variant's folder path prefix (e.g., `{storagePrefix}/{variantPath}/`). it will loop API calls using the `ContinuationToken` until the prefix is fully paginated.
* **Auto-Registration**: Controlled by the `autoVerifyChunks` boolean on `AwsS3StorageOptions` (defaults to `true`). When enabled, the higher-level pipeline wrappers (like `compose-hls`) will automatically attach this plugin to the job.
* **Data Mapping**:
    * Stores each raw `ListObjectsV2CommandOutput` verbatim in the progress summary's `verificationSources` array.
    * Matches the returned `Key` strings to the chunks in the progress dictionary.
    * Populates the actual `Size` returned by S3 into the individual chunk's `verifiedWrittenBytes`.
    * Aggregates the matched sizes up to the variant's `verifiedWrittenBytes` and the overall summary's `verifiedWrittenBytes`.
