import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transferToS3 } from '../../src/basic';
import { ComposeHlsClient } from '../../src/index';
import { TransferJobExecutor, JsonProgressTracker } from '@mtngtools/utils-hls-core';
import { AwsS3Storage } from '@mtngtools/provide-hls-aws';

vi.mock('../../src/index', () => ({
    ComposeHlsClient: vi.fn(),
}));

vi.mock('@mtngtools/utils-hls-core', () => ({
    TransferJobExecutor: vi.fn(),
    JsonProgressTracker: vi.fn(),
}));

vi.mock('@mtngtools/provide-hls-aws', () => ({
    AwsS3Storage: vi.fn(),
}));

describe('transferToS3 API', () => {

    const executeMock = vi.fn();
    const getExecutorMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        (ComposeHlsClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
            getExecutor: getExecutorMock,
        }));

        (TransferJobExecutor as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
            execute: executeMock,
        }));
    });

    it('should correctly format basic S3 transfer config missing verification', async () => {
        await transferToS3({
            sourceM3u8Path: 'https://example.com/stream.m3u8',
            mediaDestination: {
                bucket: 'test-bucket',
                storagePrefix: 'test-prefix',
                subPath: 'test-path',
                m3u8Name: 'test-index'
            }
        });

        // 1. ComposeClient created
        expect(ComposeHlsClient).toHaveBeenCalledTimes(1);

        // 2. Executor initiated
        expect(TransferJobExecutor).toHaveBeenCalledTimes(1);

        const executorCallArgs = vi.mocked(TransferJobExecutor).mock.calls[0];

        const jobConfig = executorCallArgs![0];

        // 3. Expected job config mapping 
        expect(jobConfig).toEqual({
            transferConfig: {
                source: {
                    mode: 'fetch',
                    config: { url: 'https://example.com/stream.m3u8' }
                },
                destination: {
                    mode: 'custom',
                    m3u8Name: 'test-index',
                    config: {
                        path: 's3://test-bucket/test-prefix/test-path',
                        autoVerifyChunks: true
                    }
                }
            },
            options: {} // Empty options because verification was omitted
        });

        // 4. Job executed
        expect(executeMock).toHaveBeenCalledTimes(1);

        // 5. Verification untouched
        expect(AwsS3Storage).not.toHaveBeenCalled();
        expect(JsonProgressTracker).not.toHaveBeenCalled();
    });

    it('should correctly build string path omitting subpaths', async () => {
        await transferToS3({
            sourceM3u8Path: 'https://example.com/stream.m3u8',
            mediaDestination: {
                bucket: 'test-bucket'
            }
        });

        const executorCallArgs = vi.mocked(TransferJobExecutor).mock.calls[0];
        const jobConfig = executorCallArgs![0];

        const configAny = jobConfig.transferConfig.destination.config as any;
        expect(configAny.path).toBe('s3://test-bucket');
    });

    it('should inject provided AWS parameters and verification settings', async () => {
        await transferToS3({
            sourceM3u8Path: 'https://example.com/stream.m3u8',
            mediaDestination: {
                bucket: 'test-bucket',
                additionalS3Params: { ACL: 'public-read' }
            },
            verificationDestination: {
                bucket: 'status-bucket',
                storagePrefix: 'status-logs',
                additionalS3Params: { StorageClass: 'STANDARD_IA' }
            }
        });

        const executorCallArgs = vi.mocked(TransferJobExecutor).mock.calls[0];
        const jobConfig = executorCallArgs![0];

        // verify AWS parameters included inside the destination object configuration
        const configAny = jobConfig.transferConfig.destination.config as any;
        expect(configAny.additionalPutObjectParams).toEqual({ ACL: 'public-read' });

        // verify mock objects constructed for external json tracker log
        expect(AwsS3Storage).toHaveBeenCalledTimes(1);
        expect(AwsS3Storage).toHaveBeenCalledWith({
            bucket: 'status-bucket',
            storagePrefix: 'status-logs',
            additionalPutObjectParams: { StorageClass: 'STANDARD_IA' }
        });

        expect(JsonProgressTracker).toHaveBeenCalledTimes(1);

        // Verify the job config options was mutated to include tracker instance
        expect(jobConfig.options).toHaveProperty('progressTracker');

    });
});
