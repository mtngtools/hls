/**
 * Vitest configuration for hls-utils package
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      ...(process.env.E2E_ENABLED === 'true'
        ? ['tests/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
        : []),
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    environment: 'node',
    passWithNoTests: true,
  },
});
