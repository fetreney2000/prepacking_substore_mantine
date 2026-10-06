import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Next requires tsconfig "jsx": "preserve", which Vite's oxc transform would
  // otherwise pass through verbatim - leaving JSX that cannot be parsed.
  // (Vitest runs on rolldown-vite, so the option is `oxc`, not `esbuild`.)
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  resolve: {
    // Mirror tsconfig's "@/*" alias, which Next resolves but Vite does not.
    alias: { '@': path.dirname(fileURLToPath(import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
