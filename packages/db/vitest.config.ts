import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*', 'src/test/**', 'src/client.ts', 'src/migrate.ts'],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 20,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@kratos/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
