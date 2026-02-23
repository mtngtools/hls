import { describe, it, expect } from 'vitest';
import { transferToS3 } from '../../src/basic';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';

const isE2EEnabled = process.env.AWS_S3_E2E_ENABLED === 'true';

const d = isE2EEnabled ? describe : describe.skip;

d('transferToS3 E2E', () => {
    const SOURCE_URL = process.env.TEST_HLS_URL;
    const S3_BUCKET = process.env.TEST_S3_BUCKET;
    const S3_PREFIX = process.env.TEST_S3_PREFIX;
    const S3_PATH = process.env.TEST_S3_PATH;
    const S3_M3U8_NAME = process.env.TEST_S3_M3U8_NAME;

    const STATUS_BUCKET = process.env.TEST_STATUS_BUCKET;
    const STATUS_PREFIX = process.env.TEST_STATUS_PREFIX;
    const STATUS_PATH = process.env.TEST_STATUS_PATH;

    const MAKE_PUBLIC = process.env.TEST_S3_MAKE_PUBLIC === 'true';

    it('should utilize transferToS3 helper to run identical functional test', async () => {
        if (!SOURCE_URL || !S3_BUCKET || !S3_PATH || !STATUS_BUCKET || !STATUS_PATH || !S3_M3U8_NAME) {
            throw new Error('Missing required E2E testing environment variables. Ensure .env.test.e2e.local is configured properly.');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-') + '-basic';
        const s3PrefixStr = S3_PREFIX ? S3_PREFIX : '';
        const statusPrefixStr = STATUS_PREFIX ? STATUS_PREFIX : '';

        // Derive identical paths to compare functionality with original composing e2e test
        const storagePrefix = `${s3PrefixStr}${timestamp}`;
        const subPath = S3_PATH;

        console.debug(`[DEBUG] transferToS3 helper Target Prefix: ${storagePrefix}`);
        console.debug(`[DEBUG] transferToS3 helper Source App URL: ${SOURCE_URL}`);

        const statusStoragePrefix = `${statusPrefixStr}${timestamp}`;

        console.debug(`[DEBUG] transferToS3 Mapping internal statuses: Bucket=${STATUS_BUCKET}, Prefix=${statusStoragePrefix}`);

        const commonAclParams: Omit<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'> | undefined = MAKE_PUBLIC ? { ACL: 'public-read' } : undefined;

        try {
            await transferToS3({
                sourceM3u8Path: SOURCE_URL,
                mediaDestination: {
                    bucket: S3_BUCKET,
                    storagePrefix,
                    subPath,
                    m3u8Name: S3_M3U8_NAME.replace('.m3u8', ''),
                    ...(commonAclParams ? { additionalS3Params: commonAclParams } : {})
                },
                verificationDestination: {
                    bucket: STATUS_BUCKET,
                    storagePrefix: statusStoragePrefix,
                    ...(commonAclParams ? { additionalS3Params: commonAclParams } : {})
                }
            });
            console.debug('[DEBUG] Execution completed normally without throwing exception via helper.');
            expect(true).toBe(true);
        } catch (error) {
            console.error('\n[FATAL] E2E transferToS3 execution caught an unhandled exception.\n');
            console.error('--- EXCEPTION DETAILS ---');
            console.error(error);
            console.error('-------------------------\n');
            throw error;
        }

    }, 600000);
});
