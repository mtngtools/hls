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
    const S3_M3U8_NAME = process.env.TEST_S3_M3U8_NAME;

    const STATUS_BUCKET = process.env.TEST_STATUS_BUCKET;
    const STATUS_PREFIX = process.env.TEST_STATUS_PREFIX;
    const STATUS_PATH = process.env.TEST_STATUS_PATH;

    const MAKE_PUBLIC = process.env.TEST_S3_MAKE_PUBLIC === 'true';

    it('should transfer HLS stream to S3 and write status to S3', async () => {
        if (!SOURCE_URL || !S3_BUCKET || !S3_PATH || !STATUS_BUCKET || !STATUS_PATH || !S3_M3U8_NAME) {
            throw new Error('Missing required E2E testing environment variables. Ensure .env.test.e2e.local is configured properly.');
        }

        const client = new ComposeHlsClient();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const s3PrefixStr = S3_PREFIX ? S3_PREFIX : '';

        // Let's create an s3:// formatted path to trigger ComposeStorage dynamically mapping to AwsS3Storage
        const s3DestinationPath = `s3://${S3_BUCKET}/${s3PrefixStr}${timestamp}/${S3_PATH}`;

        console.debug(`[DEBUG] Target Destination Path: ${s3DestinationPath}`);
        console.debug(`[DEBUG] Source App URL: ${SOURCE_URL}`);

        const transferConfig: TransferConfig = {
            source: {
                mode: 'fetch',
                config: { url: SOURCE_URL! },
            },
            destination: {
                // Using custom mode to trigger compose-hls logic
                mode: 'custom',
                m3u8Name: S3_M3U8_NAME!.replace('.m3u8', ''), // Pass strictly root root-name
                config: {
                    path: s3DestinationPath,
                    autoVerifyChunks: true, // Explicitly enforce S3 bucket verifications
                    // If MAKE_PUBLIC is enabled, pass extra AWS parameters via the unified config
                    ...(MAKE_PUBLIC ? { additionalPutObjectParams: { ACL: 'public-read' } } : {})
                }
            }
        };

        // Initialize actual AwsS3Storage for the status tracker independently 
        const statusPrefixStr = STATUS_PREFIX ? STATUS_PREFIX : '';
        const statusStoragePrefix = `${statusPrefixStr}${timestamp}`;

        console.debug(`[DEBUG] Mapping internal statuses: Bucket=${STATUS_BUCKET}, Prefix=${statusStoragePrefix}`);

        const statusStorage = new AwsS3Storage({
            bucket: STATUS_BUCKET!,
            storagePrefix: statusStoragePrefix,
            ...(MAKE_PUBLIC ? { additionalPutObjectParams: { ACL: 'public-read' } } : {})
        });

        // Utilize the JsonProgressTracker which now targets S3 directly!
        const mockContext = { config: transferConfig, metadata: {} };
        const progressTracker = new JsonProgressTracker(statusStorage, STATUS_PATH!, mockContext);

        // Intercept the final payload to print it cleanly in the console
        const originalOnFinish = progressTracker.onFinish.bind(progressTracker);
        progressTracker.onFinish = async (summary, variantProgresses, success) => {
            console.log('\n[DEBUG] FINAL JSON PROGRESS TRACKER PAYLOAD:');
            console.log(JSON.stringify(summary, null, 2));
            console.log('\n[DEBUG] DETAILED VARIANT PROGRESSES:');
            console.log(JSON.stringify(variantProgresses, null, 2));
            return originalOnFinish(summary, variantProgresses, success);
        };

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

        console.debug('[DEBUG] Invoking Executor pipeline step-by-step...');

        try {
            // Execute the job
            await executor.execute();
            console.debug('[DEBUG] Execution completed normally without throwing exception.');

            // If execution finishes without throwing an error, the pipeline is proven successful.
            // It successfully read all streams, uploaded via lib-storage to S3, and dumped JSON configurations to S3.
            expect(true).toBe(true);
        } catch (error) {
            console.error('\n[FATAL] E2E Transfer execution caught an unhandled exception.\n');
            console.error('--- EXCEPTION CONTEXT ---');
            console.error('Input Parameters:');
            console.error(`  - SOURCE_URL:     ${SOURCE_URL}`);
            console.error(`  - S3_BUCKET:      ${S3_BUCKET}`);
            console.error(`  - S3_PREFIX:      ${S3_PREFIX}`);
            console.error(`  - S3_PATH:        ${S3_PATH}`);
            console.error(`  - S3_M3U8_NAME:   ${S3_M3U8_NAME}`);
            console.error(`  - STATUS_BUCKET:  ${STATUS_BUCKET}`);
            console.error(`  - STATUS_PREFIX:  ${STATUS_PREFIX}`);
            console.error(`  - STATUS_PATH:    ${STATUS_PATH}\n`);

            console.error('Resolved Run Variables:');
            console.error(`  - timestamp:           ${timestamp}`);
            console.error(`  - s3DestinationPath:   ${s3DestinationPath}`);
            console.error(`  - statusStoragePrefix: ${statusStoragePrefix}\n`);

            console.error('--- EXCEPTION DETAILS ---');
            console.error(error);
            console.error('-------------------------\n');
            throw error; // Re-throw to ensure Vitest correctly marks the suite as a failure.
        }
    }, 600000); // Allow up to 10 minutes since it involves internet fetching and uploading
});
