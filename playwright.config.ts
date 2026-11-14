import { defineConfig } from '@playwright/test';

// One worker per CI shard: software WebGL is CPU-bound and two workers starve it.
// Sharding across jobs provides the parallel speedup; `PW_WORKERS` overrides.
const envWorkers = Number(process.env.PW_WORKERS);
const workers = Number.isFinite(envWorkers) && envWorkers > 0 ? envWorkers : process.env.CI ? 1 : 2;
const envPort = Number(process.env.PW_PORT);
const port = Number.isFinite(envPort) && envPort > 0 ? envPort : 5173;

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
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    // Sharded by test, not by file: campaign.spec alone runs ~13 min and used to land whole on one
    // CI shard (916 s against 237 s for the next). The specs share no state between tests.
    { name: 'fast', testIgnore: SLOW_SPECS, fullyParallel: true },
    { name: 'slow', testMatch: SLOW_SPECS },
  ],
  webServer: {
    // serve the production build in CI (faster, closer to prod) and reuse a dev server locally
    command: process.env.CI
      ? `yarn build && yarn preview --port ${port} --strictPort`
      : `yarn dev --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
