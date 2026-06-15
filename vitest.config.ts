import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Single root Vitest config covering all workspaces.
 * `@hisobotchi/shared` is aliased to its source so tests run without a build step.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@hisobotchi/shared': resolve(import.meta.dirname, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    environment: 'node',
  },
});
