import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// eslint-config-next still ships legacy (eslintrc) presets, so they are
// converted to flat config here rather than re-authored by hand.
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
      '.kilo/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // The Mongoose models in lib/server are intentionally untyped — the
      // schemas are built at runtime, so documents are `any` by design and
      // the request/response shapes are typed in the route handlers instead.
      '@typescript-eslint/no-explicit-any': 'off',
      // `const { _id, ...rest } = doc` deliberately "uses" a binding just to
      // drop it from `rest`.
      '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true }],
    },
  },
];

export default config;
