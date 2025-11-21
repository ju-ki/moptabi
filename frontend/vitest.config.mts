import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'json'],
      reportOnFailure: true,
      // Exclude configuration files and UI helper components (e.g., shadcn/ui 'ui' folder)
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/src/components/ui/**',
        '**/src/types/**',
        '**/src/models/**',
        '**/src/data/**',
        '**/src/app/**',
        '**/.next/**',
        '**/*.config.*',
        '**/vitest.config.*',
        '**/vite.config.*',
        '**/postcss.config.*',
        '**/tailwind.config.*',
        '**/eslintrc.*',
        '**/*.d.ts',
      ],
    },
    outputFile: {
      json: './coverage/coverage-final-frontend.json',
      jsonSummary: './coverage/coverage-summary-frontend.json',
    },
  },
});
