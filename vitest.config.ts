import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: false, // disable environment variable file loading
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.output/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

