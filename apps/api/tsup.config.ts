import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**/*.ts'],
  splitting: true, // split the code into smaller chunks
  sourcemap: false, // disable sourcemaps (temporary)
  clean: true,
  noExternal: [
    '@workspace/ai',
    '@workspace/auth',
    '@workspace/billing',
    '@workspace/cache',
    '@workspace/core',
    '@workspace/db',
    '@workspace/engine',
    '@workspace/env',
    '@workspace/realtime',
    '@workspace/storage',
    '@workspace/utils',
    '@workspace/vector-store',
  ],
})
