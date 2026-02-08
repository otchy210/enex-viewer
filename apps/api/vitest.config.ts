import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
