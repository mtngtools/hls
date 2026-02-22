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
}
```

## Implementations

### `AwsS3Storage`
Implements the `Storage` interface from `@mtngtools/utils-hls-types`.
*   `store(stream: TransferStream, path: string, context: TransferContext): Promise<number>`
*   **Note**: The `path` parameter passed to `store` will be joined with the `storagePrefix` (if configured) when generating the final S3 object key.
*   Streams Native Node Streams / WebStreams successfully via `aws-sdk` `PutObjectCommand`. Returns tracked `bytesWritten` efficiently for progress tracking APIs.
