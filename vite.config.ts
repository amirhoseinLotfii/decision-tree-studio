import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], restoreMocks: true },
  build: {
    sourcemap: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-runtime', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/,
            },
            { name: 'validation', test: /node_modules[\\/]zod[\\/]/ },
          ],
        },
      },
    },
  },
});
