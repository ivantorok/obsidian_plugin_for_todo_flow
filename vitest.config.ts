import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  resolve: {
    conditions: ['browser'],
    alias: {
      'obsidian': '/src/__mocks__/obsidian.ts'
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    reporters: ['default', 'json'],
    outputFile: 'logs/vitest-results.json',
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
});
