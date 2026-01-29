/**
 * Main CLI handler
 */

import { HlsClient } from '@mtngtools/hls-base';
import { TransferJobExecutor } from '@mtngtools/hls-core';
import type { TransferJob, OverallProgress, VariantProgress } from '@mtngtools/hls-types';
import type { CliArgs } from './args.js';
import { loadConfig, createTransferConfig } from './config.js';

/**
 * Execute transfer command
 */
export async function executeTransfer(args: CliArgs): Promise<void> {
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

    // Create HLS client with default implementations
    const client = new HlsClient();

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

    // Create executor
    const executor = new TransferJobExecutor(job, client.getExecutor());

    // Execute transfer
    if (!args.quiet) {
      console.log(`Transferring HLS content from ${args.source} to ${args.destination}...`);
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

