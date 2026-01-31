/**
 * Unit tests for chunk naming and path generation logic
 */

import { describe, it, expect } from 'vitest';
import { DefaultPipelineExecutor } from '../../src/pipeline.js';
import { HlsParser } from '../../src/parser.js';
import { OfetchFetcher } from '@mtngtools/hls-transfer';
import { MockStorage } from '../integration/helpers.js';
import type { DefaultImplementations, TransferContext, Chunk, Variant, VariantManifest } from '@mtngtools/hls-types';

describe('Pipeline Naming Logic', () => {
    const defaults: DefaultImplementations = {
        fetcher: new OfetchFetcher(),
        storage: new MockStorage(),
        parser: new HlsParser(),
    };
    const executor = new DefaultPipelineExecutor(defaults);

    const mockContext: TransferContext = {
        config: {
            source: { mode: 'fetch', config: { url: 'https://example.com/main.m3u8' } },
            destination: { mode: 'file', config: { path: '/tmp/out' } },
        },
        metadata: {},
    };

    const mockVariant: Variant = {
        uri: 'variant.m3u8',
        bandwidth: 1000,
    };

    const mockManifest: VariantManifest = {
        version: 3,
        targetDuration: 10,
        mediaSequence: 0,
        chunks: [],
        playlistType: 'VOD',
    };

    describe('generateChunkPath', () => {
        it('should extract number from numbered filename', async () => {
            const chunk: Chunk = {
                duration: 10,
                uri: 'segment001.ts',
            };

            const path = await executor.generateChunkPath(
                'https://example.com/segment001.ts',
                mockVariant,
                mockManifest,
                chunk,
                mockContext
            );

            expect(path).toBe('/tmp/out/001.ts');
        });

        it('should strip query parameters', async () => {
            const chunk: Chunk = {
                duration: 10,
                uri: 'segment123.ts?token=abc',
            };

            const path = await executor.generateChunkPath(
                'https://example.com/segment123.ts?token=abc',
                mockVariant,
                mockManifest,
                chunk,
                mockContext
            );

            expect(path).toBe('/tmp/out/123.ts');
        });

        it('should fall back to index for non-numbered filenames', async () => {
            const chunk: Chunk = {
                duration: 10,
                uri: 'video_fragment_a.ts',
            };
            // Add chunk to manifest so index can be found
            const manifestWithChunk = { ...mockManifest, chunks: [chunk] };

            const path = await executor.generateChunkPath(
                'https://example.com/video_fragment_a.ts',
                mockVariant,
                manifestWithChunk,
                chunk,
                mockContext
            );

            expect(path).toBe('/tmp/out/0.ts');
        });

        it('should respect subfolders for absolute variant URIs', async () => {
            const absoluteVariant: Variant = {
                uri: 'https://example.com/high/index.m3u8',
                bandwidth: 5000000,
            };

            const chunk: Chunk = {
                duration: 10,
                uri: 'segment001.ts',
            };

            const path = await executor.generateChunkPath(
                'https://example.com/high/segment001.ts',
                absoluteVariant,
                mockManifest,
                chunk,
                mockContext
            );

            // getVariantPath returns `${bandwidth}/`
            expect(path).toBe('/tmp/out/5000000/001.ts');
        });
    });
});
