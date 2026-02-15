import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*', 'src/test/**'],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 30,
        lines: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@kratos/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@kratos/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
      '@kratos/ai': path.resolve(__dirname, '../../packages/ai/src/index.ts'),
    },
  },
});
