import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**/*.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  noExternal: [
    '@workspace/ai',
    '@workspace/auth',
    '@workspace/billing',
    '@workspace/cache',
    '@workspace/db',
    '@workspace/engine',
    '@workspace/env',
    '@workspace/realtime',
    '@workspace/storage',
    '@workspace/utils',
    '@workspace/vector-store',
  ],
})
