import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // run all files in one fork — prevents ESM mock isolation issues
        execArgv: ['--max-old-space-size=4096'],
      },
    },
    testTimeout: 15_000,  // generous timeout for mock-heavy async tests
  },
});
