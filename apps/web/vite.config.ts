import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the build works from any sub-path (GitHub Pages).
  base: './',
  server: { port: 5173, fs: { allow: ['../..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
