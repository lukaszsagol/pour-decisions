import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4317',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    // PW_SOFTWARE_GL=1 renders without the GPU, like CI.
    launchOptions: process.env.PW_SOFTWARE_GL ? { args: ['--disable-gpu'] } : {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
    },
  ],
  webServer: [
    { command: 'npx vite --port 4317 --strictPort', port: 4317, reuseExistingServer: !process.env.CI },
    // The production build, for the service worker (run `vite build` first; `npm run e2e` does).
    { command: 'npx vite preview --port 4318 --strictPort', port: 4318, reuseExistingServer: !process.env.CI },
  ],
});
