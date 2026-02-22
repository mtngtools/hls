import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JsonProgressTracker } from '../../src/json-progress-tracker.js';
import type { Storage, TransferContext, TransferProgressSummary, VariantTransferProgress } from '@mtngtools/utils-hls-types';

/**
 * Helper function to read the written JSON from the passed stream argument
 */
async function readJsonFromStream(stream: any): Promise<any> {
    const reader = stream.getReader();
    let result = '';
    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
    }
    result += decoder.decode();
    return JSON.parse(result);
}

describe('JsonProgressTracker', () => {
    let mockStorage: Storage;
    let mockContext: TransferContext;
    let tracker: JsonProgressTracker;
    const mockedDateStr = '2023-01-01T12-00-00-000Z';
    const basePath = '/tmp/progress';

    beforeEach(() => {
        mockStorage = {
            store: vi.fn(),
        };
        mockContext = {} as TransferContext;

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
        tracker = new JsonProgressTracker(mockStorage, basePath, mockContext);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should write interim summary on start', async () => {
        await tracker.onStart(100);

        expect(mockStorage.store).toHaveBeenCalledTimes(1);
        const [stream, path, context] = vi.mocked(mockStorage.store).mock.calls[0]!;

        expect(path).toBe(`${basePath}/${mockedDateStr}-job/interim/status.json`);
        expect(context).toBe(mockContext);

        const payload = await readJsonFromStream(stream);
        expect(payload).toEqual({
            totalChunks: 100,
            completedChunks: 0,
            failedChunks: 0,
            totalExpectedBytes: 0,
            totalWrittenBytes: 0,
            variants: {},
        });
    });

    it('should write interim summary and variant progress on progress update', async () => {
        const mockSummary: TransferProgressSummary = {
            totalChunks: 100,
            completedChunks: 10,
            failedChunks: 0,
            totalExpectedBytes: 5000,
            totalWrittenBytes: 4000,
            variants: {
                '720p': {
                    totalChunks: 50,
                    completedChunks: 10,
                    failedChunks: 0,
                    totalExpectedBytes: 5000,
                    totalWrittenBytes: 4000,
                }
            }
        };

        const mockVariantProgress: VariantTransferProgress = {
            variantPath: '720p',
            totalChunks: 50,
            completedChunks: 10,
            failedChunks: 0,
            totalExpectedBytes: 5000,
            totalWrittenBytes: 4000,
            chunks: {}
        };

        await tracker.onProgress(mockSummary, mockVariantProgress);

        expect(mockStorage.store).toHaveBeenCalledTimes(2);

        // Check high-level summary
        const [summaryStream, summaryPath] = vi.mocked(mockStorage.store).mock.calls[0]!;
        expect(summaryPath).toBe(`${basePath}/${mockedDateStr}-job/interim/status.json`);
        const storedSummary = await readJsonFromStream(summaryStream);
        expect(storedSummary).toEqual(mockSummary);

        // Check variant detailed status
        const [variantStream, variantPath] = vi.mocked(mockStorage.store).mock.calls[1]!;
        expect(variantPath).toBe(`${basePath}/${mockedDateStr}-job/interim/720p/status.json`);
        const storedVariant = await readJsonFromStream(variantStream);
        expect(storedVariant).toEqual(mockVariantProgress);
    });

    it('should finalize status files to the root directory on finish', async () => {
        const mockSummary: TransferProgressSummary = {
            totalChunks: 100,
            completedChunks: 100,
            failedChunks: 0,
            totalExpectedBytes: 50000,
            totalWrittenBytes: 50000,
            variants: {}
        };

        const mockVariantProgress1: VariantTransferProgress = {
            variantPath: '720p',
            totalChunks: 50,
            completedChunks: 50,
            failedChunks: 0,
            totalExpectedBytes: 25000,
            totalWrittenBytes: 25000,
            chunks: {}
        };

        const mockVariantProgress2: VariantTransferProgress = {
            variantPath: '1080p',
            totalChunks: 50,
            completedChunks: 50,
            failedChunks: 0,
            totalExpectedBytes: 25000,
            totalWrittenBytes: 25000,
            chunks: {}
        };

        await tracker.onFinish(mockSummary, [mockVariantProgress1, mockVariantProgress2], true);

        expect(mockStorage.store).toHaveBeenCalledTimes(3);

        const call1 = vi.mocked(mockStorage.store).mock.calls[0]!;
        expect(call1[1]).toBe(`${basePath}/${mockedDateStr}-job/status.json`);

        const call2 = vi.mocked(mockStorage.store).mock.calls[1]!;
        expect(call2[1]).toBe(`${basePath}/${mockedDateStr}-job/720p/status.json`);

        const call3 = vi.mocked(mockStorage.store).mock.calls[2]!;
        expect(call3[1]).toBe(`${basePath}/${mockedDateStr}-job/1080p/status.json`);
    });

    it('should cleanly serialize sanitized variant paths (like strictly bandwidth integers) generated by the executor directly without query strings', async () => {
        const mockSummary: TransferProgressSummary = {
            totalChunks: 100,
            completedChunks: 10,
            failedChunks: 0,
            totalExpectedBytes: 5000,
            totalWrittenBytes: 4000,
            variants: {}
        };

        // TransferJobExecutor now generates normalized, query-stripped folder names natively
        const sanitizedVariantPath = '1240800';

        const mockVariantProgress: VariantTransferProgress = {
            variantPath: sanitizedVariantPath,
            totalChunks: 50,
            completedChunks: 10,
            failedChunks: 0,
            totalExpectedBytes: 5000,
            totalWrittenBytes: 4000,
            chunks: {}
        };

        await tracker.onProgress(mockSummary, mockVariantProgress);

        const [, variantPath] = vi.mocked(mockStorage.store).mock.calls[1]!;

        // Assert it strictly routes to the deterministic clean directory path provided
        expect(variantPath).toBe(`${basePath}/${mockedDateStr}-job/interim/1240800/status.json`);
    });
});
