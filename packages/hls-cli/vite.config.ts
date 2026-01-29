import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli-entry.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        '@mtngtools/hls-types',
        '@mtngtools/hls-parser',
        '@mtngtools/hls-base',
        '@mtngtools/hls-core',
        'node:fs',
        'node:path',
      ],
    },
    outDir: 'dist',
  },
});

