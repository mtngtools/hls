import { ComposeHlsClient } from '@mtngtools/compose-hls';
import { AwsS3Storage } from '@mtngtools/provide-hls-aws';
import { TransferJobExecutor } from '@mtngtools/utils-hls-core';
import type { TransferJob } from '@mtngtools/utils-hls-types';

// Ensure required environment variables are set
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_NAME'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Error: Missing required environment variable: ${envVar}`);
        console.error(`Please set it before running this example.`);
        process.exit(1);
    }
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

async function main() {
    console.log(`Starting Advanced S3 Upload Example`);
    console.log(`Target Bucket: ${BUCKET_NAME}`);

    // Create a ComposeHlsClient
    // We provide a custom AwsS3Storage instance as our storage mechanism.
    // The ComposeHlsClient will automatically use the `AwsS3ChunkVerificationPlugin`
    // when it detects an S3 destination, ensuring that chunks are verified on upload.
    const client = new ComposeHlsClient({
        storage: new AwsS3Storage({
            bucket: BUCKET_NAME,
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            // Prefix to organize the uploads
            storagePrefix: 'advanced-example-uploads',
            // Example of passing additional S3 PutObject params
            additionalPutObjectParams: {
                CacheControl: 'max-age=3600',
                ContentDisposition: 'inline',
            }
        })
    });

    const sourceUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

    // We use the custom s3:// scheme which the ComposeHlsClient detects to enable automatic chunk verification
    const destinationPath = `s3://${BUCKET_NAME}/advanced-example-uploads`;

    console.log(`\nTransferring:`);
    console.log(`  Source:      ${sourceUrl}`);
    console.log(`  Destination: ${destinationPath}`);

    // Define the Transfer Job
    const job: TransferJob = {
        transferConfig: {
            source: {
                mode: 'fetch',
                config: { url: sourceUrl }
            },
            destination: {
                mode: 'custom',
                config: {
                    path: destinationPath,
                    // Advanced bucket configuration passed via custom config
                    bucket: BUCKET_NAME,
                    storagePrefix: 'advanced-example-uploads'
                }
            }
        },
        options: {
            onOverallProgress: (progress) => {
                const percent = Math.round((progress.completedChunks / Math.max(progress.totalChunks, 1)) * 100);
                // process.stdout.write(`\rProgress: ${percent}% (${progress.completedChunks}/${progress.totalChunks} chunks)`);
            },
            onVariantProgress: (progress) => {
                // You can also track individual variant speeds, resolutions, etc
                process.stdout.write('.');
            },
            onError: (error) => {
                console.error(`\nError during transfer:`, error);
            }
        }
    };

    try {
        // Execute the pipeline using TransferJobExecutor and the Client's executor
        const transferJobExecutor = new TransferJobExecutor(job, client.getExecutor());

        await transferJobExecutor.execute();

        console.log(`\n\nTransfer completed successfully!`);

    } catch (error) {
        console.error(`\nFailed to complete transfer:`, error);
        process.exit(1);
    }
}

main().catch(console.error);
