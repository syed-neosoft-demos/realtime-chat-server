import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // HTTP tests exercise compiled decorator metadata, not the source transform.
  resolve: { alias: { '@': fileURLToPath(new URL('./dist', import.meta.url)) } },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
