import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'compose-hls',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                'node:stream',
                '@mtngtools/frame-hls-base',
                '@mtngtools/provide-hls-aws',
                '@mtngtools/utils-hls-types'
            ]
        },
    },
    plugins: [dts()],
});
