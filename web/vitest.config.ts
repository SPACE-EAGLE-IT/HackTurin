import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests cover the pure helpers (validation, URL parameters, access levels, domain rules).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: { environment: 'node', include: ['**/*.test.ts'], exclude: ['node_modules', '.next'] },
})
