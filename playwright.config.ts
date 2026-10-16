import { defineConfig } from '@playwright/test';

// Local runs can parallelize (set PW_WORKERS to override); CI keeps a single
// worker because the software WebGL (SwiftShader) runners are CPU-bound.
const workers = process.env.CI ? 1 : Number(process.env.PW_WORKERS ?? 2);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers,
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
