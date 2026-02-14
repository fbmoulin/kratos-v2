import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@kratos/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@kratos/db': path.resolve(__dirname, '../db/src/index.ts'),
    },
  },
});
