import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'hls-base',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                'node:stream',
                '@mtngtools/hls-core',
                '@mtngtools/hls-transfer',
                '@mtngtools/hls-types',
                '@mtngtools/hls-parser',
                '@mtngtools/hls-utils'
            ],
        },
    },
    plugins: [dts()],
});
