import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'hls-transfer',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                'node:fs',
                'node:path',
                'node:stream',
                'node:stream/promises',
                'ofetch',
                '@mtngtools/hls-core',
                '@mtngtools/hls-types'
            ],
        },
    },
    plugins: [dts()],
});
