import { defineConfig } from '@playwright/test';

// One worker per CI shard: software WebGL is CPU-bound and two workers starve it.
// Sharding across jobs provides the parallel speedup; `PW_WORKERS` overrides.
const envWorkers = Number(process.env.PW_WORKERS);
const workers = Number.isFinite(envWorkers) && envWorkers > 0 ? envWorkers : process.env.CI ? 1 : 2;

// Heaviest specs: excluded from the `fast` project (quick local runs) and covered
// by the `slow` project / nightly workflow. The default `yarn test:e2e` runs both.
const SLOW_SPECS = [
  '**/ai.spec.ts',
  '**/campaign-completable.spec.ts',
  '**/campaign-playtest.spec.ts',
  '**/chavin-campaign.spec.ts',
  '**/moche-campaign.spec.ts',
  '**/wari-campaign.spec.ts',
  '**/caral-city.spec.ts',
  '**/caral-scene.spec.ts',
  '**/caral-worker.spec.ts',
  '**/settlement.spec.ts',
  '**/save.spec.ts',
];

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
  projects: [
    { name: 'fast', testIgnore: SLOW_SPECS },
    { name: 'slow', testMatch: SLOW_SPECS },
  ],
  webServer: {
    // serve the production build in CI (faster, closer to prod) and reuse a dev server locally
    command: process.env.CI ? 'yarn build && yarn preview --port 5173 --strictPort' : 'yarn dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
