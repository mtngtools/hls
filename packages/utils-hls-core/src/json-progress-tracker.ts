import type {
    ProgressTracker,
    TransferProgressSummary,
    VariantTransferProgress,
    Storage,
    TransferContext,
} from '@mtngtools/utils-hls-types';

/**
 * A concrete ProgressTracker that writes progress state to JSON files using a given Storage interface.
 * Files are written hierarchically into a timestamped directory to ensure atomicity and separation.
 */
export class JsonProgressTracker implements ProgressTracker {
    private readonly jobStartTimestamp: string;
    private basePath: string;

    // Dummy context needed to satisfy the Storage interface signature.
    // In practice, progress trackers might utilize a specialized context or have this provided by the core orchestrator.
    private storageContext: TransferContext;

    constructor(
        private readonly storage: Storage,
        basePath: string,
        context: TransferContext
    ) {
        this.jobStartTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.basePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
        this.storageContext = context;
    }

    /**
     * Generates the root directory for this tracking job.
     */
    private get jobDir(): string {
        return `${this.basePath}/${this.jobStartTimestamp}-job`;
    }

    /**
     * Helper to write a JSON payload to a specified path using the Storage interface.
     */
    private async writeJson(path: string, payload: unknown): Promise<void> {
        const jsonString = JSON.stringify(payload, null, 2);

        // We must adapt the string to the Abstract TransferStream type for the generic Storage interface.
        // In many JS environments this could be a Readable stream or Buffer. 
        // Here we'll wrap it in a Web API ReadableStream, which is standard for cross-platform.
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(jsonString));
                controller.close();
            }
        });

        await this.storage.store(stream, path, this.storageContext);
    }

    /**
     * Called before any transfers begin
     * @param totalChunks Total number of chunks to transfer across all variants
     */
    async onStart(totalChunks: number): Promise<void> {
        // Write an initial empty summary to the interim directory
        const initialSummary: TransferProgressSummary = {
            totalChunks,
            completedChunks: 0,
            failedChunks: 0,
            totalExpectedBytes: 0,
            totalWrittenBytes: 0,
            variants: {},
        };

        await this.writeJson(`${this.jobDir}/interim/status.json`, initialSummary);
    }

    /**
     * Called periodically during transfers (e.g., at 10% intervals per variant)
     * @param summary Current high-level state of the overall transfer
     * @param variantProgress Current detailed state of the specific variant being updated
     */
    async onProgress(summary: TransferProgressSummary, variantProgress: VariantTransferProgress): Promise<void> {
        // 1. Update the interim high-level summary
        await this.writeJson(`${this.jobDir}/interim/status.json`, summary);

        // 2. Write the interim variant-specific detailed status
        const variantPath = variantProgress.variantPath || 'default';
        await this.writeJson(`${this.jobDir}/interim/${variantPath}/status.json`, variantProgress);
    }

    /**
     * Called when all transfers finish (either successfully or failed)
     * @param summary Final high-level state of the overall transfer
     * @param variantProgresses Final detailed state for every variant
     * @param success Whether the overall pipeline succeeded
     */
    async onFinish(
        summary: TransferProgressSummary,
        variantProgresses: VariantTransferProgress[],
        _success: boolean
    ): Promise<void> {
        // 1. Write the final high-level summary to the root of the job folder
        await this.writeJson(`${this.jobDir}/status.json`, summary);

        // 2. Write the final variant-specific statuses to the root of their variant folders
        const writePromises = variantProgresses.map((vp) => {
            const variantPath = vp.variantPath || 'default';
            return this.writeJson(`${this.jobDir}/${variantPath}/status.json`, vp);
        });

        await Promise.all(writePromises);
    }
}
