import { test, expect, Page } from '@playwright/test';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

function settlementSig(page: Page) {
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const overlays = g.settlements ?? [];
    let meshes = 0;
    for (const o of overlays) o.group.traverse((m: any) => (m.isMesh ? (meshes += 1) : null));
    const plan = overlays[0]?.plan ?? null;
    return {
      count: overlays.length,
      meshes,
      dwellings: plan ? plan.dwellings.length : 0,
      fields: plan ? plan.fields.map((f: any) => ({ x: f.x, z: f.z })) : [],
      roads: plan ? plan.roads.length : 0,
    };
  });
}

test('a starting base carries its planned fields and roads', async ({ page }) => {
  await boot(page, '/?civ=moche&period=2&seed=777&fog=0&low=1&noloop=1');
  const s = await settlementSig(page);
  expect(s.count).toBeGreaterThan(0);
  expect(s.meshes).toBeGreaterThan(0);
  expect(s.fields.length).toBeGreaterThan(0);
  // a road to every dwelling (and then some fields)
  expect(s.roads).toBeGreaterThanOrEqual(s.dwellings);
});

test('the settlement fields and roads sit on buildable, dry, gentle ground', async ({ page }) => {
  await boot(page, '/?civ=inca&period=5&seed=777&fog=0&low=1&noloop=1');
  const bad = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const plan = g.settlements?.[0]?.plan;
    if (!plan) return -1;
    const points = [...plan.fields, ...plan.roads.map((r: any) => r.to)];
    return points.filter(
      (p: any) =>
        g.terrain.isWater(p.x, p.z) || !g.terrain.isBuildable(p.x, p.z) || g.terrain.getSlope(p.x, p.z) > 0.35,
    ).length;
  });
  expect(bad).toBe(0);
});

test('the settlement layout is deterministic for the same seed', async ({ page }) => {
  const sample = async () => {
    await boot(page, '/?civ=moche&period=2&seed=777&fog=0&low=1&noloop=1');
    return settlementSig(page);
  };
  const a = await sample();
  const b = await sample();
  expect(b.fields).toEqual(a.fields);
  expect(b.roads).toBe(a.roads);
});

test('the settlement overlay is regenerated on load', async ({ page }) => {
  await boot(page, '/?play=1&seed=777&fog=0&low=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && g.units.size > 0 && g.buildings.size > 0;
    },
    null,
    { timeout: 15_000 },
  );
  await page.evaluate(() => (window as unknown as { game: any }).game.saveMatch());
  await boot(page, '/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && g.buildings.size > 0;
    },
    null,
    { timeout: 15_000 },
  );
  const s = await settlementSig(page);
  expect(s.count).toBeGreaterThan(0);
  expect(s.fields.length).toBeGreaterThan(0);
});
