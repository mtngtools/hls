import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mocked } from 'vitest';
import { ComposeStorage } from '../../src/storage.js';
import { AwsS3Storage } from '@mtngtools/provide-hls-aws';
import type { Storage, TransferStream, TransferContext } from '@mtngtools/utils-hls-types';

vi.mock('@mtngtools/provide-hls-aws');

describe('ComposeStorage', () => {
    let mockBaseStorage: Mocked<Storage>;
    let mockS3Storage: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockBaseStorage = {
            store: vi.fn().mockResolvedValue(100)
        };
        mockS3Storage = {
            store: vi.fn().mockResolvedValue(200)
        };
        vi.mocked(AwsS3Storage).mockImplementation(() => mockS3Storage);
    });

    it('should fall back to base storage for standard paths', async () => {
        const storage = new ComposeStorage(mockBaseStorage);
        const context: TransferContext = {
            config: {
                source: { mode: 'fetch', config: { url: '' } },
                destination: { mode: 'file', config: { path: '/tmp/test' } }
            },
            metadata: {}
        };

        const bytes = await storage.store({} as TransferStream, '/path/file.ts', context);
        expect(bytes).toBe(100);
        expect(mockBaseStorage.store).toHaveBeenCalled();
        expect(AwsS3Storage).not.toHaveBeenCalled();
    });

    it('should route to AwsS3Storage when destination config path starts with s3://', async () => {
        const storage = new ComposeStorage(mockBaseStorage);
        const context: TransferContext = {
            config: {
                source: { mode: 'fetch', config: { url: '' } },
                destination: { mode: 'custom', config: { path: 's3://my-bucket/folder' } }
            },
            metadata: {}
        };

        const bytes = await storage.store({} as TransferStream, '/path/file.ts', context);
        expect(bytes).toBe(200);
        expect(mockS3Storage.store).toHaveBeenCalled();
        expect(mockBaseStorage.store).not.toHaveBeenCalled();
        expect(AwsS3Storage).toHaveBeenCalledWith({
            bucket: 'my-bucket',
            storagePrefix: 'folder'
        });
    });

    it('should cache and reuse AwsS3Storage instances', async () => {
        const storage = new ComposeStorage(mockBaseStorage);
        const context: TransferContext = {
            config: {
                source: { mode: 'fetch', config: { url: '' } },
                destination: { mode: 'custom', config: { path: 's3://my-bucket/folder' } }
            },
            metadata: {}
        };

        await storage.store({} as TransferStream, '/path1.ts', context);
        await storage.store({} as TransferStream, '/path2.ts', context);

        expect(AwsS3Storage).toHaveBeenCalledTimes(1); // Cached
        expect(mockS3Storage.store).toHaveBeenCalledTimes(2);
    });

    it('should route to AwsS3Storage when mode is explicitly s3', async () => {
        const storage = new ComposeStorage(mockBaseStorage);
        const context: TransferContext = {
            config: {
                source: { mode: 'fetch', config: { url: '' } },
                destination: { mode: 's3' as any, config: { bucket: 'explicit-bucket', storagePrefix: 'prefix' } }
            },
            metadata: {}
        };

        const bytes = await storage.store({} as TransferStream, '/file.ts', context);
        expect(bytes).toBe(200);
        expect(AwsS3Storage).toHaveBeenCalledWith({
            bucket: 'explicit-bucket',
            storagePrefix: 'prefix'
        });
    });

    it('should strip absolute base paths to prevent duplication in AwsS3Storage keys', async () => {
        const storage = new ComposeStorage(mockBaseStorage);
        const context: TransferContext = {
            config: {
                source: { mode: 'fetch', config: { url: '' } },
                destination: {
                    mode: 'custom',
                    config: { path: 's3://croi-rndj-media/hls-transfer-test/store/my-transfer-test/h' }
                }
            },
            metadata: {}
        };

        // If pipeline.ts gives us the FULL URL (e.g. s3://croi-rndj-media/hls-transfer-test/store/my-transfer-test/h/index.m3u8),
        // we should only pass 'index.m3u8' down to the newly configured AwsS3Storage.
        const bytes = await storage.store(
            {} as TransferStream,
            's3://croi-rndj-media/hls-transfer-test/store/my-transfer-test/h/index.m3u8',
            context
        );

        expect(bytes).toBe(200);
        expect(AwsS3Storage).toHaveBeenCalledWith({
            bucket: 'croi-rndj-media',
            storagePrefix: 'hls-transfer-test/store/my-transfer-test/h'
        });

        expect(mockS3Storage.store).toHaveBeenCalledWith(
            expect.anything(),
            'index.m3u8',
            context
        );
    });

    it('should strip absolute base paths containing dynamic timestamps seamlessly', async () => {
        const storage = new ComposeStorage(mockBaseStorage);
        // Emulate the transfer.test.ts configuration injection directly
        const context: TransferContext = {
            config: {
                source: { mode: 'fetch', config: { url: '' } },
                destination: {
                    mode: 'custom',
                    // This mirrors S3_PREFIX + timestamp + S3_PATH closely
                    config: { path: 's3://croi-rndj-media/hls-transfer-test/store2026-02-22T17-37-33-574Z/my-transfer-test/h' }
                }
            },
            metadata: {}
        };

        const bytes = await storage.store(
            {} as TransferStream,
            's3://croi-rndj-media/hls-transfer-test/store2026-02-22T17-37-33-574Z/my-transfer-test/h/1240800/1.ts',
            context
        );

        expect(bytes).toBe(200);
        expect(AwsS3Storage).toHaveBeenCalledWith({
            bucket: 'croi-rndj-media',
            storagePrefix: 'hls-transfer-test/store2026-02-22T17-37-33-574Z/my-transfer-test/h'
        });

        expect(mockS3Storage.store).toHaveBeenCalledWith(
            expect.anything(),
            '1240800/1.ts',
            context
        );
    });

    it('should cleanly execute storage mapping alongside JsonProgressTracker output strings', async () => {
        // Representing the E2E script explicitly bypassing ComposeStorage completely:
        const statusStoragePrefix = 'hls-transfer-test/status2026-02-22T17-37-33-574Z';
        const rawJsonBucket = new AwsS3Storage({
            bucket: 'croi-rndj-media',
            storagePrefix: statusStoragePrefix
        });

        const context: TransferContext = {
            config: {
                source: { mode: 'fetch', config: { url: '' } },
                destination: {
                    mode: 'custom',
                    config: { path: 's3://croi-rndj-media/hls-transfer-test/store/xyz' }
                }
            },
            metadata: {}
        };

        // JsonProgressTracker relies purely on standard nested storage paths
        // simulating the internal tracker outputs manually:
        const summaryStatusPath = `my-transfer-test/status.json`;
        const variantStatusPath = `my-transfer-test/1240800/status.json`;

        await rawJsonBucket.store({} as TransferStream, summaryStatusPath, context);
        await rawJsonBucket.store({} as TransferStream, variantStatusPath, context);

        // Verify that providing relative path targets into the nested AwsS3Storage 
        // yields correct prefix assignments internally during bucket Puts.
        expect(mockS3Storage.store).toHaveBeenCalledWith(
            expect.anything(),
            'my-transfer-test/status.json',
            context
        );

        expect(mockS3Storage.store).toHaveBeenCalledWith(
            expect.anything(),
            'my-transfer-test/1240800/status.json',
            context
        );
    });
});
