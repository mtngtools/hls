import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                'cli-entry': resolve(__dirname, 'src/cli-entry.ts'),
            },
            formats: ['es'],
            fileName: (format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
            external: [
                '@mtngtools/frame-hls-cli',
                '@mtngtools/compose-hls',
                '@mtngtools/utils-hls-core',
                '@mtngtools/utils-hls-types',
                'node:process',
                'node:path',
                'node:fs'
            ],
            output: {
                banner: (chunk) => chunk.name === 'cli-entry' ? '#!/usr/bin/env node\n' : ''
            }
        },
        outDir: 'dist',
    },
});
