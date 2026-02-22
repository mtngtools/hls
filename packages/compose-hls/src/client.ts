import {
    HlsClient,
    type HlsClientConfig,
    FsStorage,
} from '@mtngtools/frame-hls-base';
import { ComposeStorage } from './storage.js';
import { createAwsS3ChunkVerificationPlugin } from '@mtngtools/provide-hls-aws';

export type ComposeHlsClientConfig = HlsClientConfig;

export class ComposeHlsClient extends HlsClient {
    constructor(config: ComposeHlsClientConfig = {}) {
        // Wrap whatever storage was provided (or default FsStorage) with our ComposeStorage
        const baseStorage = config.storage ?? new FsStorage();
        const wrappedStorage = new ComposeStorage(baseStorage);

        super({
            ...config,
            storage: wrappedStorage,
            plugins: {
                ...config.plugins,
                // Automatically inject a proxy verifyChunks that proxies to AwsS3ChunkVerificationPlugin
                // if the destination is S3 and autoVerifyChunks !== false
                verifyChunks: async (summary, variantProgresses, context) => {
                    const destConfig = context.config.destination.config;
                    let path = '';
                    let autoVerifyChunks = true;
                    // Support CustomConfig with path or string casts
                    if (
                        typeof destConfig === 'object' &&
                        destConfig !== null &&
                        'path' in destConfig
                    ) {
                        path = destConfig.path as string;
                        if ('autoVerifyChunks' in destConfig) {
                            autoVerifyChunks = destConfig.autoVerifyChunks !== false;
                        }
                    } else if (typeof destConfig === 'string') {
                        path = destConfig;
                    }

                    const isS3Destination =
                        path.startsWith('s3://') ||
                        context.config.destination.mode === ('s3' as 'custom');

                    if (isS3Destination && autoVerifyChunks) {
                        let bucket = '';
                        let storagePrefix = '';

                        if (path.startsWith('s3://')) {
                            const url = new URL(path);
                            bucket = url.hostname;
                            storagePrefix = url.pathname.substring(1);
                        } else {
                            if (typeof destConfig === 'object' && destConfig !== null) {
                                if ('bucket' in destConfig) {
                                    bucket = destConfig.bucket as string;
                                }
                                if ('storagePrefix' in destConfig) {
                                    storagePrefix = destConfig.storagePrefix as string;
                                }
                            }
                        }

                        if (bucket) {
                            const proxyPlugin = createAwsS3ChunkVerificationPlugin({
                                bucket,
                                storagePrefix: storagePrefix || undefined,
                                autoVerifyChunks,
                            });
                            await proxyPlugin(summary, variantProgresses, context);
                            return;
                        }
                    }

                    // Fallback to existing verifyChunks if provided
                    if (config.plugins?.verifyChunks) {
                        await config.plugins.verifyChunks(
                            summary,
                            variantProgresses,
                            context
                        );
                    }
                },
            },
        });
    }
}
