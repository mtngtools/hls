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

        console.log(`[ComposeStorage] Evaluating destination mode: '${context.config.destination.mode}', path: '${path}'`);

        if (path.startsWith('s3://') || context.config.destination.mode === 's3' as 'custom') {
            let bucket = '';
            let storagePrefix = '';
            let additionalPutObjectParams: any = undefined;

            if (path.startsWith('s3://')) {
                const url = new URL(path);
                bucket = url.hostname;
                storagePrefix = url.pathname.substring(1); // remove leading slash
            }

            if (typeof destConfig === 'object' && destConfig !== null) {
                if (!bucket && 'bucket' in destConfig) {
                    bucket = destConfig.bucket as string;
                }
                if (!storagePrefix && 'storagePrefix' in destConfig) {
                    storagePrefix = destConfig.storagePrefix as string;
                }
                if ('additionalPutObjectParams' in destConfig) {
                    additionalPutObjectParams = destConfig.additionalPutObjectParams;
                }
            }

            console.log(`[ComposeStorage] Found S3 match. Bucket: '${bucket}', Prefix: '${storagePrefix}'`);

            const cacheKey = path + (additionalPutObjectParams ? JSON.stringify(additionalPutObjectParams) : '');
            if (this.s3StorageCache.has(cacheKey)) {
                return this.s3StorageCache.get(cacheKey)!;
            }

            if (bucket) {
                const s3Storage = new AwsS3Storage({
                    bucket,
                    storagePrefix: storagePrefix || undefined,
                    ...(additionalPutObjectParams ? { additionalPutObjectParams } : {})
                });

                this.s3StorageCache.set(cacheKey, s3Storage);
                return s3Storage;
            } else {
                console.log(`[ComposeStorage] S3 matched but no bucket found! Falling back to base storage.`);
            }
        } else {
            console.log(`[ComposeStorage] No S3 match found. Using base storage (likely FsStorage).`);
        }

        return null;
    }

    async store(stream: TransferStream, path: string, context: TransferContext): Promise<number> {
        const s3Storage = this.getS3Storage(context);
        if (s3Storage) {
            let relativePath = path;
            const destConfig = context.config.destination.config;
            let basePath = '';

            if (typeof destConfig === 'object' && destConfig !== null && 'path' in destConfig) {
                basePath = destConfig.path as string;
            } else if (typeof destConfig === 'string') {
                basePath = destConfig;
            }

            if (basePath && relativePath.startsWith(basePath)) {
                relativePath = relativePath.substring(basePath.length);
                if (relativePath.startsWith('/')) {
                    relativePath = relativePath.substring(1);
                }
            }

            return s3Storage.store(stream, relativePath, context);
        }
        return this.baseStorage.store(stream, path, context);
    }
}
