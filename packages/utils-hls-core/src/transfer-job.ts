/**
 * TransferJob executor
 * Orchestrates the HLS transfer pipeline
 */

import type {
  TransferJob,
  TransferContext,
  PipelineExecutor,
  OverallProgress,
  VariantProgress,
  Variant,
  VariantManifest,
  Chunk,
  TransferProgressSummary,
  VariantTransferProgress,
} from '@mtngtools/utils-hls-types';
import { Semaphore } from './concurrency.js';

/**
 * TransferJobExecutor - Executes a transfer job using a pipeline executor
 */
export class TransferJobExecutor {
  private context: TransferContext;
  private overallProgress: OverallProgress;
  private variantProgressMap = new Map<Variant, VariantProgress>();
  private sourceSemaphore: Semaphore;
  private destinationSemaphore: Semaphore;

  constructor(
    private job: TransferJob,
    private executor: PipelineExecutor,
  ) {
    // Initialize context
    this.context = {
      config: job.transferConfig,
      metadata: {},
    };

    // Initialize progress tracking
    this.overallProgress = {
      totalVariants: 0,
      completedVariants: 0,
      totalChunks: 0,
      completedChunks: 0,
      totalBytes: 0,
      transferredBytes: 0,
    };

    // Note: The TransferJobOptions must be updated in utils-hls-types/src/core.ts 
    // to officially support `progressTracker?: ProgressTracker`. It's done below via a cast for now.
    // The preferred way would be adding it to `TransferJobOptions`, which we will do shortly.

    // Initialize semaphores for concurrency control
    const sourceMaxConcurrent =
      job.transferConfig.source.concurrency?.maxConcurrent ?? 5;
    const destMaxConcurrent =
      job.transferConfig.destination.concurrency?.maxConcurrent ?? 5;

    this.sourceSemaphore = new Semaphore(sourceMaxConcurrent);
    this.destinationSemaphore = new Semaphore(destMaxConcurrent);
  }

  /**
   * Execute the transfer job
   */
  async execute(): Promise<void> {
    try {
      // Step 1: Fetch Main Manifest
      const mainUrl = this.getMainManifestUrl();
      const mainResponse = await this.executor.fetchMainManifest(
        mainUrl,
        this.context,
      );

      // Step 2: Parse Main Manifest
      const mainContent = await mainResponse.text();
      const mainManifest = await this.executor.parseMainManifest(
        mainContent,
        this.context,
      );
      this.context.mainManifest = mainManifest;

      // Step 3: Filter Variants
      const filteredVariants = await this.executor.filterVariants(
        this.context,
      );
      this.context.filteredVariants = filteredVariants;

      // Initialize progress tracking for variants
      this.initializeProgress(filteredVariants);

      // Trigger OnStart on progress tracker
      const startTracker = this.job.options?.progressTracker;
      if (startTracker) {
        // Total chunks requires downloading variant manifests first, or estimating
        // We will call onStart with 0 for now and update total chunks along the way.
        await startTracker.onStart(0);
      }

      // Step 8: Create Destination Main Manifest
      await this.executor.createDestinationMainManifest(this.context);

      // Step 9: Generate Main Manifest Path
      const mainPath = await this.executor.generateMainManifestPath(
        mainUrl,
        mainManifest,
        this.context,
      );

      // Step 10: Store Main Manifest
      await this.executor.storeManifest(
        mainManifest,
        mainPath,
        this.context,
      );

      // Process variants in parallel (with concurrency limit)
      await this.processVariants(filteredVariants);

      const finalSummary = this.buildProgressSummary();
      const finalVariantProgresses = this.buildVariantProgresses();

      // Step 17: Verify Chunks (Optional)
      await this.executor.verifyChunks(
        finalSummary,
        finalVariantProgresses,
        this.context
      );

      // Step 18: Finalize
      await this.executor.finalize(this.context);

      // Trigger OnFinish
      const finishTracker = this.job.options?.progressTracker;
      if (finishTracker) {
        await finishTracker.onFinish(
          finalSummary,
          finalVariantProgresses,
          true
        );
      }
    } catch (error) {
      this.handleError(error as Error);
      const errTracker = this.job.options?.progressTracker;
      if (errTracker) {
        await errTracker.onFinish(
          this.buildProgressSummary(),
          this.buildVariantProgresses(),
          false
        );
      }
      throw error;
    }
  }

  /**
   * Get main manifest URL from source config
   */
  private getMainManifestUrl(): string {
    const sourceConfig = this.context.config.source;
    if (sourceConfig.mode === 'fetch' && 'url' in sourceConfig.config) {
      return sourceConfig.config.url;
    }
    throw new Error('Unsupported source mode or missing URL');
  }

  /**
   * Initialize progress tracking for variants
   */
  private initializeProgress(variants: Variant[]): void {
    this.overallProgress.totalVariants = variants.length;

    for (const variant of variants) {
      this.variantProgressMap.set(variant, {
        variant,
        totalChunks: 0,
        completedChunks: 0,
        totalBytes: 0,
        transferredBytes: 0,
        chunks: {},
      });
    }
  }

  /**
   * Process all variants
   * Variants are processed in parallel with concurrency control
   */
  private async processVariants(variants: Variant[]): Promise<void> {
    // Process variants sequentially for now (can be parallelized later)
    // This ensures we don't overwhelm the system
    for (const variant of variants) {
      await this.processVariant(variant);
    }
  }

  /**
   * Process a single variant
   */
  private async processVariant(variant: Variant): Promise<void> {
    try {
      // Step 4: Fetch Variant Manifest
      // Resolve variant URL and store in context for chunk URI resolution
      const mainUrl = this.getMainManifestUrl();
      const variantUrl = new URL(variant.uri, mainUrl).href;
      this.context.metadata.variantUrl = variantUrl;

      const variantResponse = await this.sourceSemaphore.execute(() =>
        this.executor.fetchVariantManifest(variant, this.context),
      );

      // Step 5: Parse Variant Manifest
      const variantContent = await variantResponse.text();
      const variantManifest = await this.executor.parseVariantManifest(
        variantContent,
        variant,
        this.context,
      );

      // Step 6: Chunk Discovery
      const allChunks = await this.executor.discoverChunks(
        variantManifest,
        variant,
        this.context,
      );

      // Step 7: Chunk Filter
      const filteredChunks = await this.executor.filterChunks(
        variantManifest,
        variant,
        allChunks,
        this.context,
      );

      // Update progress tracking
      const variantProgress = this.variantProgressMap.get(variant);
      if (variantProgress) {
        variantProgress.totalChunks = filteredChunks.length;
        this.overallProgress.totalChunks += filteredChunks.length;
      }

      // Step 11: Create Destination Variant Manifest
      await this.executor.createDestinationVariantManifest(
        filteredChunks,
        variant,
        this.context,
      );

      // Step 12: Generate Variant Manifest Path
      const variantPath = await this.executor.generateVariantManifestPath(
        variant.uri,
        variant,
        this.context,
      );

      // Download and store chunks in parallel
      await this.processChunks(filteredChunks, variant, variantManifest);

      // Step 10: Store Variant Manifest (after chunks are processed)
      await this.executor.storeManifest(
        variantManifest,
        variantPath,
        this.context,
      );

      // Mark variant as completed
      this.overallProgress.completedVariants++;
      this.reportOverallProgress();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Helper to build the high level progress summary payload
   */
  private buildProgressSummary(): TransferProgressSummary {
    const summary: TransferProgressSummary = {
      totalChunks: this.overallProgress.totalChunks,
      completedChunks: this.overallProgress.completedChunks,
      failedChunks: 0, // We don't track fail counts well yet, will sum from variants:
      totalExpectedBytes: 0,
      totalWrittenBytes: this.overallProgress.transferredBytes,
      variants: {}
    };

    let totalFailed = 0;

    for (const [variant, progress] of this.variantProgressMap.entries()) {
      summary.variants[this.getVariantFolderName(variant)] = {
        totalChunks: progress.totalChunks,
        completedChunks: progress.completedChunks,
        failedChunks: 0, // calculate if tracking failed chunks inside progress
        totalExpectedBytes: progress.totalBytes,
        totalWrittenBytes: progress.transferredBytes
      };
    }
    summary.failedChunks = totalFailed;
    return summary;
  }

  /**
   * Helper to build the variant detail payloads
   */
  private buildVariantProgresses(): VariantTransferProgress[] {
    const progresses: VariantTransferProgress[] = [];
    for (const [variant, progress] of this.variantProgressMap.entries()) {
      // For now we pass empty chunks dictionaries since we don't store them in memory.
      // A complete implementation would store chunk objects or fire events.
      progresses.push({
        variantPath: this.getVariantFolderName(variant),
        totalChunks: progress.totalChunks,
        completedChunks: progress.completedChunks,
        failedChunks: 0,
        totalExpectedBytes: progress.totalBytes,
        totalWrittenBytes: progress.transferredBytes,
        chunks: { ...progress.chunks } // Clone dictionary to safely transport chunk metrics
      });
    }
    return progresses;
  }

  /**
   * Process all chunks for a variant
   * Chunks are downloaded and stored in parallel with concurrency control
   */
  private async processChunks(
    chunks: Chunk[],
    variant: Variant,
    _manifest: VariantManifest,
  ): Promise<void> {
    const chunkPromises = chunks.map((chunk) =>
      this.processChunk(chunk, variant, _manifest),
    );

    await Promise.all(chunkPromises);
  }

  /**
   * Process a single chunk with retry logic
   */
  private async processChunk(
    chunk: Chunk,
    variant: Variant,
    manifest: VariantManifest,
  ): Promise<void> {
    const retryConfig = this.context.config.source.retry ?? {
      maxRetries: 3,
      retryDelay: 1000,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // Step 13: Download Chunk (with concurrency control)
        const stream = await this.sourceSemaphore.execute(() =>
          this.executor.downloadChunk(chunk, this.context),
        );

        // Step 14: Generate Chunk Path
        const chunkPath = await this.executor.generateChunkPath(
          chunk.uri,
          variant,
          manifest,
          chunk,
          this.context,
        );

        // Step 15: Store Chunk (with concurrency control)
        const bytesWritten = await this.destinationSemaphore.execute(() =>
          this.executor.storeChunk(stream, chunkPath, chunk, this.context),
        );

        // Update progress
        const variantProgress = this.variantProgressMap.get(variant);
        if (variantProgress) {
          variantProgress.completedChunks++;
          variantProgress.transferredBytes += bytesWritten;

          const chunkFileName = chunkPath.split('/').pop() || chunk.uri;
          variantProgress.chunks[chunkFileName] = {
            writtenBytes: bytesWritten,
            success: true
          };

          this.overallProgress.completedChunks++;
          this.overallProgress.transferredBytes += bytesWritten;
        }

        this.reportVariantProgress(variant);
        this.reportOverallProgress();

        const progressTracker = this.job.options?.progressTracker;
        if (progressTracker) {
          const total = this.overallProgress.totalChunks;
          const completed = this.overallProgress.completedChunks;
          const interval = Math.max(1, Math.floor(total / 10));
          if (completed % interval === 0 || completed === total) {
            const summary = this.buildProgressSummary();
            if (variantProgress) {
              const variantProgressDetails: VariantTransferProgress = {
                variantPath: this.getVariantFolderName(variant),
                totalChunks: variantProgress.totalChunks,
                completedChunks: variantProgress.completedChunks,
                failedChunks: 0,
                totalExpectedBytes: variantProgress.totalBytes,
                totalWrittenBytes: variantProgress.transferredBytes,
                chunks: {}
              };
              await progressTracker.onProgress(summary, variantProgressDetails);
            }
          }
        }

        return; // Success
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryConfig.maxRetries) {
          // Wait before retrying
          await this.sleep(retryConfig.retryDelay);
          continue;
        }
        // Max retries reached
        this.handleError(lastError);
        // Continue processing other chunks even if one fails
        // Could be made configurable
        throw lastError;
      }
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Report overall progress
   */
  private reportOverallProgress(): void {
    if (this.job.options?.onOverallProgress) {
      this.job.options.onOverallProgress({ ...this.overallProgress });
    }
  }

  /**
   * Report variant progress
   */
  private reportVariantProgress(variant: Variant): void {
    if (this.job.options?.onVariantProgress) {
      const progress = this.variantProgressMap.get(variant);
      if (progress) {
        this.job.options.onVariantProgress({ ...progress });
      }
    }
  }

  /**
   * Helper to determine clean variant folder name for progress tracking
   */
  private getVariantFolderName(variant: Variant): string {
    const isAbsolute = variant.uri.match(/^https?:\/\//);
    if (isAbsolute) {
      // Use bandwidth as folder identifier for absolute URLs
      return variant.bandwidth ? `${variant.bandwidth}` : 'variant';
    }
    // For relative URIs, extract the directory path without trailing slash
    const pathParts = variant.uri.split('/');
    pathParts.pop(); // Remove filename
    return pathParts.length > 0 ? pathParts.join('/') : 'variant';
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    if (this.job.options?.onError) {
      this.job.options.onError(error, this.context);
    }
  }
}

