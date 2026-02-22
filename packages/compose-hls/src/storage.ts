import type { Storage, TransferStream, TransferContext } from '@mtngtools/utils-hls-types';
import { AwsS3Storage } from '@mtngtools/provide-hls-aws';

/**
 * ComposeStorage - Wraps a base storage and intercepts S3 destinations
 */
export class ComposeStorage implements Storage {
    private s3StorageCache: Map<string, AwsS3Storage> = new Map();

    constructor(private baseStorage: Storage) { }

    private getS3Storage(context: Pick<TransferContext, 'config'>): AwsS3Storage | null {
        const destConfig = context.config.destination.config;
        let path = '';

        // Support CustomConfig with path or string casts
        if (typeof destConfig === 'object' && destConfig !== null && 'path' in destConfig) {
            path = destConfig.path as string;
        } else if (typeof destConfig === 'string') {
            path = destConfig;
        }

        if (path.startsWith('s3://') || context.config.destination.mode === 's3' as 'custom') {
            const cacheKey = path;
            if (this.s3StorageCache.has(cacheKey)) {
                return this.s3StorageCache.get(cacheKey)!;
            }

            let bucket = '';
            let storagePrefix = '';

            if (path.startsWith('s3://')) {
                const url = new URL(path);
                bucket = url.hostname;
                storagePrefix = url.pathname.substring(1); // remove leading slash
            } else {
                // Mode is s3 but path doesn't start with s3:// ?
                // Try to pull explicit bucket from config if available
                if (typeof destConfig === 'object' && destConfig !== null && 'bucket' in destConfig) {
                    bucket = destConfig.bucket as string;
                }
                if (typeof destConfig === 'object' && destConfig !== null && 'storagePrefix' in destConfig) {
                    storagePrefix = destConfig.storagePrefix as string;
                }
            }

            if (bucket) {
                const s3Storage = new AwsS3Storage({
                    bucket,
                    storagePrefix: storagePrefix || undefined
                });

                this.s3StorageCache.set(cacheKey, s3Storage);
                return s3Storage;
            }
        }

        return null;
    }

    async store(stream: TransferStream, path: string, context: TransferContext): Promise<number> {
        const s3Storage = this.getS3Storage(context);
        if (s3Storage) {
            return s3Storage.store(stream, path, context);
        }
        return this.baseStorage.store(stream, path, context);
    }
}
