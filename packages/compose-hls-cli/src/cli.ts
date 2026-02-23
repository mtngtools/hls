import { ComposeHlsClient } from '@mtngtools/compose-hls';
import { TransferJobExecutor, JsonProgressTracker } from '@mtngtools/utils-hls-core';
import { AwsS3Storage } from '@mtngtools/provide-hls-aws';
import type { TransferJob, OverallProgress, VariantProgress } from '@mtngtools/utils-hls-types';
import { type CliArgs, loadConfig, createTransferConfig } from '@mtngtools/frame-hls-cli';
import type { ComposeCliArgs } from './options.js';

/**
 * Execute transfer command using ComposeHlsClient
 */
export async function executeTransfer(args: CliArgs, composeArgs?: ComposeCliArgs): Promise<void> {
    try {
        // Load config file if provided
        const configFile = args.config ? loadConfig(args.config) : undefined;

        // Create transfer configuration
        const transferConfig = createTransferConfig(
            {
                source: args.source,
                destination: args.destination,
                maxConcurrent: args.maxConcurrent,
                maxRetries: args.maxRetries,
                retryDelay: args.retryDelay,
            },
            configFile,
        );

        if (composeArgs) {
            // Apply compose specific config overrides over standard pipeline arguments
            if (composeArgs.m3u8Name) {
                transferConfig.destination.m3u8Name = composeArgs.m3u8Name.replace('.m3u8', '');
            }

            if (typeof transferConfig.destination.config === 'object') {
                const composeConfig = transferConfig.destination.config as Record<string, unknown>;

                if (composeArgs.autoVerifyChunks !== undefined) {
                    composeConfig.autoVerifyChunks = composeArgs.autoVerifyChunks;
                }

                if (composeArgs.acl) {
                    composeConfig.additionalPutObjectParams = {
                        ...(composeConfig.additionalPutObjectParams as object || {}),
                        ACL: composeArgs.acl
                    };
                }
            }
        }

        // Create HLS client with Compose AWS capabilities
        const client = new ComposeHlsClient();

        // Create transfer job
        const job: TransferJob = {
            transferConfig,
            options: {
                onOverallProgress: (progress: OverallProgress) => {
                    if (!args.quiet) {
                        reportOverallProgress(progress, args.verbose ?? false);
                    }
                },
                onVariantProgress: (progress: VariantProgress) => {
                    if (args.verbose && !args.quiet) {
                        reportVariantProgress(progress);
                    }
                },
                onError: (error: Error) => {
                    if (!args.quiet) {
                        console.error(`Error: ${error.message}`);
                        if (args.verbose && error.stack) {
                            console.error(error.stack);
                        }
                    }
                },
            },
        };

        if (composeArgs?.statusBucket) {
            const statusStorage = new AwsS3Storage({
                bucket: composeArgs.statusBucket,
                storagePrefix: composeArgs.statusPrefix,
            });
            // We pass an empty context since this runs in the CLI outside the pipeline hooks context
            job.options!.progressTracker = new JsonProgressTracker(statusStorage, '', { metadata: {}, config: transferConfig } as any);
        }

        // Create executor
        const executor = new TransferJobExecutor(job, client.getExecutor());

        // Execute transfer
        if (!args.quiet) {
            console.log(`Transferring HLS content from ${args.source} to ${args.destination} (with AWS S3 support)...`);
        }

        await executor.execute();

        if (!args.quiet) {
            console.log('Transfer completed successfully!');
        }
    } catch (error) {
        console.error(`Transfer failed: ${error instanceof Error ? error.message : String(error)}`);
        if (args.verbose && error instanceof Error && error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

/**
 * Report overall progress
 */
function reportOverallProgress(progress: OverallProgress, verbose: boolean): void {
    const variantPercent =
        progress.totalVariants > 0
            ? Math.round((progress.completedVariants / progress.totalVariants) * 100)
            : 0;
    const chunkPercent =
        progress.totalChunks > 0 ? Math.round((progress.completedChunks / progress.totalChunks) * 100) : 0;

    if (verbose) {
        console.log(
            `Progress: ${progress.completedVariants}/${progress.totalVariants} variants (${variantPercent}%), ` +
            `${progress.completedChunks}/${progress.totalChunks} chunks (${chunkPercent}%)`,
        );
    } else {
        // Simple progress indicator
        process.stdout.write(`\rProgress: ${chunkPercent}% (${progress.completedChunks}/${progress.totalChunks} chunks)`);
    }
}

/**
 * Report variant progress
 */
function reportVariantProgress(progress: VariantProgress): void {
    const percent =
        progress.totalChunks > 0
            ? Math.round((progress.completedChunks / progress.totalChunks) * 100)
            : 0;
    console.log(
        `  Variant ${progress.variant.uri}: ${progress.completedChunks}/${progress.totalChunks} chunks (${percent}%)`,
    );
}
