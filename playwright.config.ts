import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  // CI runners are slower (software WebGL); one retry covers genuine environment flakes
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    // serve the production build in CI (faster, closer to prod) and reuse a dev server locally
    command: process.env.CI ? 'yarn build && yarn preview --port 5173 --strictPort' : 'yarn dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
