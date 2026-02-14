import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@kratos/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@kratos/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
      '@kratos/ai': path.resolve(__dirname, '../../packages/ai/src/index.ts'),
    },
  },
});
