import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'tests/smoke/**', 'node_modules/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
