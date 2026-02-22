import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'provide-hls-aws',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                'node:stream',
                '@aws-sdk/client-s3',
                '@aws-sdk/lib-storage',
                '@mtngtools/utils-hls-types'
            ],
        },
    },
    plugins: [dts()],
});
