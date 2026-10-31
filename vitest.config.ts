import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@col/shared': path.resolve(__dirname, 'packages/shared/src/index.ts') } },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 20000 },
});
