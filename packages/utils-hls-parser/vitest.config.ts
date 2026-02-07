/**
 * Vitest configuration for hls-parser package
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Include unit and integration tests by default
    include: [
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      // Include e2e tests only if E2E_ENABLED is set
      ...(process.env.E2E_ENABLED === 'true'
        ? ['tests/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
        : []),
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    globals: true,
    environment: 'node',
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
