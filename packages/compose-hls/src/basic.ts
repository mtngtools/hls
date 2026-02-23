


import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { ComposeHlsClient } from './index';
import { TransferJobExecutor, JsonProgressTracker } from '@mtngtools/utils-hls-core';
import { AwsS3Storage } from '@mtngtools/provide-hls-aws';
import type { TransferJob, TransferConfig } from '@mtngtools/utils-hls-types';

export type TransferToS3Config = {
    sourceM3u8Path: string;
    mediaDestination: {
        bucket: string;
        storagePrefix?: string;
        subPath?: string;
        m3u8Name?: string;
        additionalS3Params?: Omit<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'>;
    }, //path of main m3u8 becomes s3://[bucket]/[storagePrefix]/[subPath]/[m3u8Name].m3u8 (no trailing slahes, no part of sourceM3u8Path is used)
    //if verificationDestination is not provided, disable verification
    verificationDestination?: {
        bucket: string;
        storagePrefix?: string;
        subPath?: string;
        additionalS3Params?: Omit<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'>;
    };
}


export const transferToS3 = async (config: TransferToS3Config) => {
    const client = new ComposeHlsClient();

    const { bucket, storagePrefix, subPath, m3u8Name, additionalS3Params } = config.mediaDestination;

    const parts = [bucket];
    if (storagePrefix) parts.push(storagePrefix);
    if (subPath) parts.push(subPath);

    const s3DestinationPath = `s3://${parts.join('/')}`;

    const transferConfig: TransferConfig = {
        source: {
            mode: 'fetch',
            config: { url: config.sourceM3u8Path },
        },
        destination: {
            mode: 'custom',
            m3u8Name,
            config: {
                path: s3DestinationPath,
                autoVerifyChunks: true,
                ...(additionalS3Params ? { additionalPutObjectParams: additionalS3Params } : {})
            }
        }
    };

    const job: TransferJob = {
        transferConfig,
        options: {}
    };

    if (config.verificationDestination) {
        const { bucket: statusBucket, storagePrefix: statusPrefix, subPath: statusSubPath, additionalS3Params: statusParams } = config.verificationDestination;

        const statusPrefixParts = [];
        if (statusPrefix) statusPrefixParts.push(statusPrefix);
        if (statusSubPath) statusPrefixParts.push(statusSubPath);

        const statusStorage = new AwsS3Storage({
            bucket: statusBucket,
            ...(statusPrefixParts.length > 0 ? { storagePrefix: statusPrefixParts.join('/') } : {}),
            ...(statusParams ? { additionalPutObjectParams: statusParams } : {})
        });

        const mockContext = { config: transferConfig, metadata: {} };
        job.options!.progressTracker = new JsonProgressTracker(statusStorage, '', mockContext);
    }

    const executor = new TransferJobExecutor(job, client.getExecutor());
    await executor.execute();
}

