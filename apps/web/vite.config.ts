import { defineConfig } from 'vite';
import { serviceWorker } from './sw-plugin';

export default defineConfig({
  // Relative paths so the build works from any sub-path (GitHub Pages).
  base: './',
  plugins: [serviceWorker()],
  server: { port: 5173, fs: { allow: ['../..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
});
