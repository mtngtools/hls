import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'frame-hls-base',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                'node:stream',
                '@mtngtools/utils-hls-core',
                '@mtngtools/frame-hls-transfer',
                '@mtngtools/utils-hls-types',
                '@mtngtools/utils-hls-parser'
            ],
        },
    },
    plugins: [dts()],
});
