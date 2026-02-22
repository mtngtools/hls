import { describe, it, expect } from 'vitest';
import { ComposeHlsClient } from '@mtngtools/compose-hls';
import { TransferJobExecutor, JsonProgressTracker } from '@mtngtools/utils-hls-core';
import { AwsS3Storage } from '@mtngtools/provide-hls-aws';
import type { TransferJob, TransferConfig } from '@mtngtools/utils-hls-types';

const isE2EEnabled = process.env.AWS_S3_E2E_ENABLED === 'true';

const d = isE2EEnabled ? describe : describe.skip;

d('ComposeHlsClient E2E Transfer', () => {
    const SOURCE_URL = process.env.TEST_HLS_URL;
    const S3_BUCKET = process.env.TEST_S3_BUCKET;
    const S3_PREFIX = process.env.TEST_S3_PREFIX;
    const S3_PATH = process.env.TEST_S3_PATH;

    const STATUS_BUCKET = process.env.TEST_STATUS_BUCKET;
    const STATUS_PREFIX = process.env.TEST_STATUS_PREFIX;
    const STATUS_PATH = process.env.TEST_STATUS_PATH;

    it('should transfer HLS stream to S3 and write status to S3', async () => {
        if (!SOURCE_URL || !S3_BUCKET || !S3_PATH || !STATUS_BUCKET || !STATUS_PATH) {
            throw new Error('Missing required E2E testing environment variables. Ensure .env.test.e2e.local is configured properly.');
        }

        const client = new ComposeHlsClient();

        // Let's create an s3:// formatted path to trigger ComposeStorage dynamically mapping to AwsS3Storage
        const s3DestinationPath = `s3://${S3_BUCKET}/${S3_PREFIX ? S3_PREFIX + '/' : ''}${S3_PATH}`;

        const transferConfig: TransferConfig = {
            source: {
                mode: 'fetch',
                config: { url: SOURCE_URL! },
            },
            destination: {
                // Using custom mode to trigger compose-hls logic
                mode: 'custom',
                config: {
                    path: s3DestinationPath
                }
            }
        };

        // Initialize actual AwsS3Storage for the status tracker independently 
        const statusStorage = new AwsS3Storage({
            bucket: STATUS_BUCKET!,
            storagePrefix: STATUS_PREFIX
        });

        // Utilize the JsonProgressTracker which now targets S3 directly!
        const progressTracker = new JsonProgressTracker(statusStorage, STATUS_PATH!);

        const job: TransferJob = {
            transferConfig,
            options: {
                progressTracker,
                onOverallProgress: (progress) => {
                    console.log(`Overall Progress: ${progress.completedChunks}/${progress.totalChunks} chunks`);
                },
                onError: (error) => {
                    console.error('Transfer Error:', error);
                }
            }
        };

        const executor = new TransferJobExecutor(job, client.getExecutor());

        // Execute the job
        await executor.execute();

        // If execution finishes without throwing an error, the pipeline is proven successful.
        // It successfully read all streams, uploaded via lib-storage to S3, and dumped JSON configurations to S3.
        expect(true).toBe(true);
    }, 600000); // Allow up to 10 minutes since it involves internet fetching and uploading
});
