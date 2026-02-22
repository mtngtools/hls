import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AwsS3Storage } from '../../src/storage.js';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough } from 'node:stream';
import type { TransferContext } from '@mtngtools/utils-hls-types';

vi.mock('@aws-sdk/client-s3');
vi.mock('@aws-sdk/lib-storage');

describe('AwsS3Storage', () => {
    let mockClient: any;
    const mockContext: TransferContext = {
        config: { source: { mode: 'fetch', config: { url: '' } }, destination: { mode: 'custom', config: {} } },
        metadata: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockClient = new S3Client({});
        vi.mocked(S3Client).mockReturnValue(mockClient);
    });

    it('should initialize with provided s3Client', () => {
        const storage = new AwsS3Storage({
            bucket: 'test-bucket',
            s3Client: mockClient
        });
        expect(storage['client']).toBe(mockClient);
    });

    it('should initialize with credentials', () => {
        new AwsS3Storage({
            bucket: 'test-bucket',
            region: 'us-east-1',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
        });
        expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret'
            }
        }));
    });

    it('should prepend storagePrefix and resolve path', async () => {
        const storage = new AwsS3Storage({
            bucket: 'test-bucket',
            storagePrefix: 'prefix/folder'
        });

        const mockUploadDone = vi.fn().mockResolvedValue({});
        vi.mocked(Upload).mockImplementation(() => {
            return {
                done: mockUploadDone,
                on: vi.fn()
            } as any;
        });

        const stream = new PassThrough();
        stream.end('test content');

        await storage.store(stream, '/my/file.m3u8', mockContext);

        expect(Upload).toHaveBeenCalledWith(expect.objectContaining({
            params: expect.objectContaining({
                Bucket: 'test-bucket',
                Key: 'prefix/folder/my/file.m3u8',
                ContentType: 'application/vnd.apple.mpegurl'
            })
        }));
    });

    it('should count written bytes accurately', async () => {
        const storage = new AwsS3Storage({
            bucket: 'test-bucket'
        });

        const mockUploadDone = vi.fn().mockResolvedValue({});
        vi.mocked(Upload).mockImplementation((options) => {
            const bodyStream = options.params.Body as PassThrough;
            return {
                done: async () => {
                    for await (const chunk of bodyStream) { } // drain the stream
                    return mockUploadDone();
                },
                on: vi.fn()
            } as any;
        });

        const stream = new PassThrough();
        // "hello world" is 11 bytes
        stream.end('hello world');

        const bytes = await storage.store(stream, '/test.ts', mockContext);

        expect(bytes).toBe(11);
        expect(Upload).toHaveBeenCalledWith(expect.objectContaining({
            params: expect.objectContaining({
                Key: 'test.ts',
                ContentType: 'video/mp2t'
            })
        }));
    });
});
