/**
 * Root Vitest configuration
 * Shared config for all packages
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Include unit and integration tests by default
    include: [
      '**/tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      // Include e2e tests only if E2E_ENABLED is set
      ...(process.env.E2E_ENABLED === 'true'
        ? ['**/tests/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
        : []),
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    ],
    globals: true,
    environment: 'node',
    passWithNoTests: true, // Don't fail if no tests found
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
});
