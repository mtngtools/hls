import {
    ListObjectsV2Command,
    S3Client,
    type ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import type {
    TransferProgressSummary,
    VariantTransferProgress,
    TransferContext,
} from '@mtngtools/utils-hls-types';
import type { AwsS3StorageOptions } from './storage.js';

export const createAwsS3ChunkVerificationPlugin = (options: AwsS3StorageOptions) => {
    let client: S3Client;
    if (options.s3Client) {
        client = options.s3Client;
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
        client = new S3Client(config);
    }

    return async (
        summary: TransferProgressSummary,
        variantProgresses: VariantTransferProgress[],
        _context: TransferContext
    ): Promise<void> => {
        summary.verifiedWrittenBytes = 0;

        for (const variant of variantProgresses) {
            // Formulate the path prefix for this variant
            let prefix = variant.variantPath;
            if (prefix.startsWith('/')) {
                prefix = prefix.substring(1);
            }
            if (options.storagePrefix) {
                const rootPrefix = options.storagePrefix.endsWith('/')
                    ? options.storagePrefix
                    : `${options.storagePrefix}/`;
                prefix = `${rootPrefix}${prefix}`;
            }
            // Ensure prefix ends with a slash so it isolates the folder contents correctly
            if (!prefix.endsWith('/')) {
                prefix += '/';
            }

            const sources: ListObjectsV2CommandOutput[] = [];
            let totalVariantVerifiedBytes = 0;
            let continuationToken: string | undefined = undefined;

            // Note: Because the variant chunks might not be in the dictionary until the transfer starts, if the dictionary is populated correctly, we can lookup by filename. 
            // If we are passing the variant with populated chunk statuses, we can match it here.
            if (!variant.chunks) {
                variant.chunks = {};
            }

            do {
                const command: ListObjectsV2Command = new ListObjectsV2Command({
                    Bucket: options.bucket,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                });

                const response = (await client.send(command)) as unknown as ListObjectsV2CommandOutput;

                // Store the raw AWS S3 payload accurately tracking exactly what we saw on S3
                sources.push(response);

                if (response.Contents) {
                    for (const item of response.Contents) {
                        if (item.Key && item.Size !== undefined) {
                            const filename = item.Key.substring(prefix.length); // Extract local file basename
                            const chunkStatus = variant.chunks[filename];
                            if (chunkStatus) {
                                chunkStatus.verifiedWrittenBytes = item.Size;
                                totalVariantVerifiedBytes += item.Size;
                            }
                        }
                    }
                }

                continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
            } while (continuationToken);

            variant.verifiedWrittenBytes = totalVariantVerifiedBytes;
            variant.verificationSources = sources;

            summary.verifiedWrittenBytes += totalVariantVerifiedBytes;

            const summaryVariant = summary.variants[variant.variantPath];
            if (summaryVariant) {
                summaryVariant.verifiedWrittenBytes = totalVariantVerifiedBytes;
            }
        }
    };
};
