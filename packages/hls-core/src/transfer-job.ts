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
} from '@mtngtools/hls-types';
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
      // Step 1: Fetch Master Manifest
      const masterUrl = this.getMasterManifestUrl();
      const masterResponse = await this.executor.fetchMasterManifest(
        masterUrl,
        this.context,
      );

      // Step 2: Parse Master Manifest
      const masterContent = await masterResponse.text();
      const masterManifest = await this.executor.parseMasterManifest(
        masterContent,
        this.context,
      );
      this.context.masterManifest = masterManifest;

      // Step 3: Filter Variants
      const filteredVariants = await this.executor.filterVariants(
        this.context,
      );
      this.context.filteredVariants = filteredVariants;

      // Initialize progress tracking for variants
      this.initializeProgress(filteredVariants);

      // Step 8: Create Destination Master Manifest
      await this.executor.createDestinationMasterManifest(this.context);

      // Step 9: Generate Master Manifest Path
      const masterPath = await this.executor.generateMasterManifestPath(
        masterUrl,
        masterManifest,
        this.context,
      );

      // Step 10: Store Master Manifest
      await this.executor.storeManifest(
        masterManifest,
        masterPath,
        this.context,
      );

      // Process variants in parallel (with concurrency limit)
      await this.processVariants(filteredVariants);

      // Step 16: Finalize
      await this.executor.finalize(this.context);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Get master manifest URL from source config
   */
  private getMasterManifestUrl(): string {
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
      const masterUrl = this.getMasterManifestUrl();
      const variantUrl = new URL(variant.uri, masterUrl).href;
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
   * Process all chunks for a variant
   * Chunks are downloaded and stored in parallel with concurrency control
   */
  private async processChunks(
    chunks: Chunk[],
    variant: Variant,
    _manifest: VariantManifest,
  ): Promise<void> {
    const chunkPromises = chunks.map((chunk) =>
      this.processChunk(chunk, variant),
    );

    await Promise.all(chunkPromises);
  }

  /**
   * Process a single chunk with retry logic
   */
  private async processChunk(chunk: Chunk, variant: Variant): Promise<void> {
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
          chunk,
          this.context,
        );

        // Step 15: Store Chunk (with concurrency control)
        await this.destinationSemaphore.execute(() =>
          this.executor.storeChunk(stream, chunkPath, chunk, this.context),
        );

        // Update progress
        const variantProgress = this.variantProgressMap.get(variant);
        if (variantProgress) {
          variantProgress.completedChunks++;
          this.overallProgress.completedChunks++;
          // Note: Byte tracking would require stream size, which is complex
          // For now, we track chunk count
        }

        this.reportVariantProgress(variant);
        this.reportOverallProgress();
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
   * Handle errors
   */
  private handleError(error: Error): void {
    if (this.job.options?.onError) {
      this.job.options.onError(error, this.context);
    }
  }
}

