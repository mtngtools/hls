# @mtngtools/compose-hls

This package extends `@mtngtools/frame-hls-base` to provide **out-of-the-box support for AWS S3** as an HLS transfer destination. 

By leveraging `ComposeHlsClient`, any transfer destination path that starts with `s3://` (or uses the internal `mode: 'custom'` structure) will automatically route chunks into an AWS S3 Bucket seamlessly. It also automatically triggers post-transfer bulk byte validation using the `AwsS3ChunkVerificationPlugin` when S3 destinations are detected.

## Installation

```bash
pnpm add @mtngtools/compose-hls
```

## Basic Usage

The simplest way to use `ComposeHlsClient` is to pass a standard `s3://` destination path into your execution pipeline. It provides exactly the same interface as `HlsClient`.

```typescript
import { ComposeHlsClient } from '@mtngtools/compose-hls';
import { TransferJobExecutor } from '@mtngtools/utils-hls-core';

async function transferToS3() {
    const client = new ComposeHlsClient();
    
    const executor = new TransferJobExecutor({
        transferConfig: {
            source: {
                mode: 'fetch',
                config: { url: 'https://example.com/master.m3u8' }
            },
            destination: {
                mode: 'fetch', // Standard fetch mode parser handles 's3://' strings transparently
                config: { path: 's3://my-bucket/output-folder' }
            }
        }
    }, client.getExecutor());
    
    await executor.execute();
    console.log('Transfer to S3 complete!');
}
```

## Advanced Usage (All Config Options)

`ComposeHlsClient` allows you to inject comprehensive configuration overrides. This includes custom API parameters, client configuration, and extensive transfer pipeline modifications.

```typescript
import { ComposeHlsClient } from '@mtngtools/compose-hls';
import { TransferJobExecutor, JsonProgressTracker } from '@mtngtools/utils-hls-core';
import { FsStorage } from '@mtngtools/frame-hls-base';

async function advancedTransferToS3() {
    // 1. You can optionally supply custom storage, fetchers, and pipeline plugins into the client initialization 
    // ComposeHlsClient will seamlessly wrap external Storage interfaces (e.g. FsStorage) 
    // to preserve backwards compatibility for non-S3 tasks.
    const client = new ComposeHlsClient({
        storage: new FsStorage(), // Fallback for local files
        plugins: {
            // Optional plugins override specific steps in the pipeline lifecycle
            filterVariants: async (context) => {
                // Example: Only transfer 1080p variants
                return context.mainManifest?.variants.filter(v => v.resolution?.height === 1080) || [];
            }
        }
    });

    // 2. Define the Transfer configuration
    const jobConfig = {
        transferConfig: {
            source: {
                mode: 'fetch' as const,
                config: { 
                    url: 'https://example.com/master.m3u8',
                    headers: { 'Authorization': 'Bearer token123' },
                    timeout: 10000 
                },
                concurrency: { maxConcurrent: 5 },
                retry: { maxRetries: 3, retryDelay: 2000 }
            },
            destination: {
                // 'custom' mode allows us to pass explicit object parameters instead of raw string strings
                mode: 'custom' as const, 
                // Overrides the generated master manifest filename (default is 'main.m3u8')
                m3u8Name: 'index', 
                config: { 
                    bucket: 'my-bucket',
                    storagePrefix: 'output-folder',
                    // Disables or enforces the S3 ListObjectsV2 chunk verification automatically injected by the client
                    autoVerifyChunks: true, 
                    // Applies raw AWS S3 PutObject properties explicitly to every uploaded chunk and manifest
                    additionalPutObjectParams: {
                        ACL: 'public-read',
                        CacheControl: 'max-age=3600'
                    }
                },
                concurrency: { maxConcurrent: 10 },
                retry: { maxRetries: 5, retryDelay: 1000 }
            }
        },
        // 3. Optional runtime job hooks and tracking interfaces
        options: {
            onOverallProgress: (progress) => {
                console.log(`Global Progress: ${progress.completedChunks}/${progress.totalChunks} chunks`);
            },
            onVariantProgress: (variantProgress) => {
                console.log(`Variant ${variantProgress.variant.uri}: ${variantProgress.transferredBytes} bytes`);
            },
            onError: (error, context) => {
                console.error(`Pipeline Error:`, error.message);
            },
            // Optionally serialize chunk states into JSON status files matching the S3 structure natively
            progressTracker: new JsonProgressTracker(
                 client.getDefaults().storage, 
                 's3://my-bucket/output-folder-status', 
                 { metadata: {} } as any
            )
        }
    };
    
    const executor = new TransferJobExecutor(jobConfig, client.getExecutor());
    
    try {
        await executor.execute();
        console.log('Advanced transfer pipeline completed successfully.');
    } catch (err) {
        console.error('Transfer failed:', err);
    }
}
```

## How It Works

`ComposeHlsClient` is a drop-in replacement for `HlsClient` from `frame-hls-base`.

1. **Storage Wrapper**: It wraps the provided storage implementation (such as `FsStorage`) within `ComposeStorage`.
2. **S3 Detection**: During `store()` operations, if `ComposeStorage` detects an `s3://` URI or an S3 `custom` configuration object, it automatically routes the `TransferStream` into `AwsS3Storage` utilizing `@aws-sdk/lib-storage`. Alternatively, local paths resolve back into your underlying `FsStorage` seamlessly.
3. **Auto-Verification Plugin**: The client intercepts the `verifyChunks` pipeline step. When it validates an S3 destination, it autonomously provisions the `AwsS3ChunkVerificationPlugin`. This plugin runs a bulk `ListObjectsV2` query against the S3 bucket to verify exactly how many bytes propagated downstream to the cloud environment, persisting matching outputs strictly back into the `progressTracker` chunk dictionaries. If you've provided custom pipeline verification plugins, it cascades gracefully back to yours on non-S3 runs.
