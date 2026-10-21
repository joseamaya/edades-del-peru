import { test, expect, type Page } from '@playwright/test';

interface RigSnapshot {
  states: (string | null)[];
  times: number[];
  bones: number[][];
}

interface AssetStatus {
  id: string;
  state: string;
  refs: number;
  clips: string[];
}

async function bootDemo(page: Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&rig=1&noloop=1');
  await page.waitForFunction(
    () => {
      const w = window as unknown as { game?: unknown; __rigDemo?: unknown };
      return w.game !== undefined && w.__rigDemo !== undefined;
    },
    null,
    { timeout: 30_000 },
  );
}

test('local GLB rigs load, clone independently and animate without touching the simulation', async ({ page }) => {
  const errors: string[] = [];
  const modelWarnings: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning' && msg.text().includes('[models]')) modelWarnings.push(msg.text());
  });

  await bootDemo(page);

  const state = await page.evaluate(() => {
    const w = window as unknown as { game: any; __modelAssets: () => AssetStatus[]; __rigDemo: any };
    return {
      assets: w.__modelAssets(),
      units: w.game.units.size,
      buildings: w.game.buildings.size,
      snapshot: w.__rigDemo.snapshot() as RigSnapshot,
    };
  });

  const mannequin = state.assets.find((entry) => entry.id === 'ual_mannequin');
  expect(mannequin?.state).toBe('ready');
  expect(mannequin?.clips).toContain('Idle_Loop');
  expect(mannequin?.refs).toBe(2);
  expect(state.snapshot.states).toEqual(['idle', 'work']);
  expect(state.units).toBeGreaterThan(0);

  const before = state.snapshot;
  await page.evaluate(() => {
    const demo = (window as unknown as { __rigDemo: { update: (dt: number) => void } }).__rigDemo;
    for (let i = 0; i < 60; i++) demo.update(1 / 60);
  });
  const after = await page.evaluate(
    () => (window as unknown as { __rigDemo: { snapshot: () => RigSnapshot } }).__rigDemo.snapshot() as RigSnapshot,
  );

  expect(after.times[0]).toBeGreaterThan(before.times[0]);
  expect(after.times[1]).toBeGreaterThan(before.times[1]);
  expect(after.bones[0]).not.toEqual(after.bones[1]);
  expect(errors).toEqual([]);

  await page.evaluate(() => (window as unknown as { game: { destroy: () => void } }).game.destroy());
  const afterDestroy = await page.evaluate(
    () => (window as unknown as { __modelAssets: () => AssetStatus[] }).__modelAssets()[0],
  );
  expect(afterDestroy.state).toBe('idle');
  expect(modelWarnings).toEqual([]);
});
