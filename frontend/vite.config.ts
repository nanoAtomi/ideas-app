import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // `npm run dev` + the backend on :8000 (AUTH_MODE=dev): API calls go there.
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    // Worker threads start reliably everywhere (forked workers timed out on slower machines).
    pool: 'threads',
    setupFiles: ['./src/test-setup.ts'],
  },
});
