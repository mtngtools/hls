import type { Storage, TransferStream, TransferContext } from '@mtngtools/utils-hls-types';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough } from 'node:stream';

export interface AwsRegionAndCredentials {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;
}

export interface AwsS3StorageOptions extends AwsRegionAndCredentials {
    s3Client?: S3Client;
    bucket: string;
    storagePrefix?: string;
}

export class AwsS3Storage implements Storage {
    private client: S3Client;

    constructor(private options: AwsS3StorageOptions) {
        if (options.s3Client) {
            this.client = options.s3Client;
        } else {
            const config: any = {};
            if (options.region) config.region = options.region;
            if (options.accessKeyId && options.secretAccessKey) {
                config.credentials = {
                    accessKeyId: options.accessKeyId,
                    secretAccessKey: options.secretAccessKey,
                };
                if (options.sessionToken) {
                    config.credentials.sessionToken = options.sessionToken;
                }
            }
            this.client = new S3Client(config);
        }
    }

    async store(
        stream: TransferStream,
        path: string,
        _context: TransferContext
    ): Promise<number> {
        let finalKey = path;
        if (finalKey.startsWith('/')) {
            finalKey = finalKey.substring(1);
        }

        if (this.options.storagePrefix) {
            const prefix = this.options.storagePrefix.endsWith('/')
                ? this.options.storagePrefix
                : `${this.options.storagePrefix}/`;
            finalKey = `${prefix}${finalKey}`;
        }

        let bytesWritten = 0;

        // We create a PassThrough stream to intercept and count bytes as they flow to S3
        const tracker = new PassThrough();
        tracker.on('data', (chunk) => {
            bytesWritten += chunk.length;
        });

        // Pipe the input stream to our tracker
        if (stream && typeof (stream as { getReader?: unknown }).getReader === 'function') {
            // It's a Web ReadableStream
            const reader = (stream as ReadableStream<Uint8Array>).getReader();
            const pump = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value) {
                            tracker.write(Buffer.from(value));
                        }
                    }
                    tracker.end();
                } catch (err) {
                    tracker.destroy(err as Error);
                    throw err;
                }
            };
            // Start pumping without awaiting here, since Upload needs the tracker stream immediately
            pump().catch((err) => {
                tracker.destroy(err);
            });
        } else {
            // It's a Node stream
            const nodeStream = stream as NodeJS.ReadableStream;
            nodeStream.pipe(tracker);
        }

        const contentType = finalKey.endsWith('.m3u8')
            ? 'application/vnd.apple.mpegurl'
            : finalKey.endsWith('.json')
                ? 'application/json'
                : 'video/mp2t';

        const upload = new Upload({
            client: this.client,
            params: {
                Bucket: this.options.bucket,
                Key: finalKey,
                Body: tracker,
                ContentType: contentType,
            },
        });

        await upload.done();

        return bytesWritten;
    }
}
