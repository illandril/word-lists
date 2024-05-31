import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: 'html',
    },
    environment: 'node',
    sequence: {
      shuffle: {
        tests: true,
      },
    },
  },
});
