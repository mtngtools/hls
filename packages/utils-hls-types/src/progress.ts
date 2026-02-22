/**
 * Types for HLS transfer progress tracking
 */

/**
 * Status of a single chunk transfer
 */
export interface ChunkTransferStatus {
    /** Expected bytes from Content-Length header, if available */
    expectedBytes?: number;
    /** Actual bytes successfully written to storage */
    writtenBytes: number;
    /** Whether the chunk transfer was successful */
    success: boolean;
    /** Error code if failed (omitted message for size) */
    errorCode?: string;
}

/**
 * Overall progress state summary (High-Level)
 */
export interface TransferProgressSummary {
    /** Total number of chunks across all variants */
    totalChunks: number;
    /** Number of chunks completed successfully across all variants */
    completedChunks: number;
    /** Number of chunks that failed across all variants */
    failedChunks: number;
    /** Total expected bytes from Content-Length headers, if known */
    totalExpectedBytes: number;
    /** Total bytes successfully written across all variants */
    totalWrittenBytes: number;
    /** 
     * High-level summary of each variant's progress
     * Keyed by the variant's destination directory name (e.g. '720p')
     */
    variants: Record<string, {
        totalChunks: number;
        completedChunks: number;
        failedChunks: number;
        totalExpectedBytes: number;
        totalWrittenBytes: number;
    }>;
}

/**
 * Detailed progress state for a single variant (Variant-Level)
 */
export interface VariantTransferProgress {
    /** The destination directory name of this variant (e.g. '720p') */
    variantPath: string;
    /** Total number of chunks in this variant */
    totalChunks: number;
    /** Number of chunks completed successfully in this variant */
    completedChunks: number;
    /** Number of chunks that failed in this variant */
    failedChunks: number;
    /** Total expected bytes from Content-Length headers in this variant */
    totalExpectedBytes: number;
    /** Total bytes successfully written in this variant */
    totalWrittenBytes: number;
    /** 
     * Dictionary of chunk statuses for this variant,
     * keyed by the chunk's filename relative to the variant folder (e.g. '000.ts')
     */
    chunks: Record<string, ChunkTransferStatus>;
}

/**
 * Interface for consuming and reporting progress updates
 */
export interface ProgressTracker {
    /**
     * Called before any transfers begin
     * @param totalChunks Total number of chunks to transfer across all variants
     */
    onStart(totalChunks: number): Promise<void>;

    /**
     * Called periodically during transfers (e.g., at 10% intervals per variant)
     * @param summary Current high-level state of the overall transfer
     * @param variantProgress Current detailed state of the specific variant being updated
     */
    onProgress(summary: TransferProgressSummary, variantProgress: VariantTransferProgress): Promise<void>;

    /**
     * Called when all transfers finish (either successfully or failed)
     * @param summary Final high-level state of the overall transfer
     * @param variantProgresses Final detailed state for every variant
     * @param success Whether the overall pipeline succeeded
     */
    onFinish(
        summary: TransferProgressSummary,
        variantProgresses: VariantTransferProgress[],
        success: boolean
    ): Promise<void>;
}
