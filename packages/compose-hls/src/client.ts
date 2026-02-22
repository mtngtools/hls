import { HlsClient, type HlsClientConfig, FsStorage } from '@mtngtools/frame-hls-base';
import { ComposeStorage } from './storage.js';

export type ComposeHlsClientConfig = HlsClientConfig;

export class ComposeHlsClient extends HlsClient {
    constructor(config: ComposeHlsClientConfig = {}) {
        // Wrap whatever storage was provided (or default FsStorage) with our ComposeStorage
        const baseStorage = config.storage ?? new FsStorage();
        const wrappedStorage = new ComposeStorage(baseStorage);

        super({
            ...config,
            storage: wrappedStorage
        });
    }
}
