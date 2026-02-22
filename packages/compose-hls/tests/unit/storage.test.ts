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
});
