import { defineConfig } from 'vite';
import { serviceWorker } from './sw-plugin';

export default defineConfig({
  // Relative paths so the build works from any sub-path (GitHub Pages).
  base: './',
  plugins: [serviceWorker()],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  server: { port: 5173, fs: { allow: ['../..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
});
