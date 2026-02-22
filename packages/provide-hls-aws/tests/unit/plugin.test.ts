import { describe, it, expect, vi } from 'vitest';
import { createAwsS3ChunkVerificationPlugin } from '../../src/plugin.js';
import { S3Client, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import type { TransferProgressSummary, VariantTransferProgress } from '@mtngtools/utils-hls-types';

vi.mock('@aws-sdk/client-s3', () => {
    return {
        S3Client: class {
            send = vi.fn();
        },
        ListObjectsV2Command: class {
            constructor(public input: any) { }
        },
    };
});

describe('AwsS3ChunkVerificationPlugin', () => {
    it('should map S3 ListObjectV2 results to variant chunk statuses', async () => {
        const s3Client = new S3Client({}) as any;

        // Mock a single page of S3 results
        const mockResponse: ListObjectsV2CommandOutput = {
            $metadata: {},
            IsTruncated: false,
            Contents: [
                { Key: 'video/720p/0.ts', Size: 500 },
                { Key: 'video/720p/1.ts', Size: 600 },
                { Key: 'video/720p/unknown.ts', Size: 100 } // This shouldn't match any tracked chunk
            ]
        };
        s3Client.send.mockResolvedValue(mockResponse);

        const plugin = createAwsS3ChunkVerificationPlugin({
            s3Client,
            bucket: 'test-bucket',
            storagePrefix: 'video'
        });

        const summary: TransferProgressSummary = {
            totalChunks: 2,
            completedChunks: 2,
            failedChunks: 0,
            totalExpectedBytes: 1100,
            totalWrittenBytes: 1100,
            variants: {
                '720p': {
                    totalChunks: 2,
                    completedChunks: 2,
                    failedChunks: 0,
                    totalExpectedBytes: 1100,
                    totalWrittenBytes: 1100
                }
            }
        };

        const variantProgresses: VariantTransferProgress[] = [
            {
                variantPath: '720p',
                totalChunks: 2,
                completedChunks: 2,
                failedChunks: 0,
                totalExpectedBytes: 1100,
                totalWrittenBytes: 1100,
                chunks: {
                    '0.ts': { writtenBytes: 500, success: true },
                    '1.ts': { writtenBytes: 600, success: true },
                    'missing-on-s3.ts': { writtenBytes: 100, success: true }
                }
            }
        ];

        await plugin(summary, variantProgresses, { config: {} as any, metadata: {} });

        // Assert S3 client was called correctly
        expect(s3Client.send).toHaveBeenCalledTimes(1);
        const commandInput = s3Client.send.mock.calls[0][0].input;
        expect(commandInput.Bucket).toBe('test-bucket');
        expect(commandInput.Prefix).toBe('video/720p/');

        // Assert variant mutations
        const variant = variantProgresses[0]!;
        expect(variant.verifiedWrittenBytes).toBe(1100);
        expect(variant.verificationSources?.length).toBe(1);
        expect(variant.verificationSources![0]).toBe(mockResponse);

        // Assert chunk mutations
        expect(variant.chunks['0.ts']!.verifiedWrittenBytes).toBe(500);
        expect(variant.chunks['1.ts']!.verifiedWrittenBytes).toBe(600);
        expect(variant.chunks['missing-on-s3.ts']!.verifiedWrittenBytes).toBeUndefined();

        // Assert summary mutations
        expect(summary.verifiedWrittenBytes).toBe(1100);
        expect(summary.variants['720p']!.verifiedWrittenBytes).toBe(1100);
    });
});
