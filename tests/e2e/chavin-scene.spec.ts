import { expect, test } from '@playwright/test';

const URL = '/?civ=chavin&period=1&seed=777&fog=0&low=1&noloop=1';

async function boot(page: import('@playwright/test').Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: any }).game !== undefined, null, {
    timeout: 30_000,
  });
  return errors;
}

test('the Chavín base uses the ritual dressing set and its own landmark', { tag: '@smoke' }, async ({ page }) => {
  const errors = await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const dressing = g.settlementDressing ?? [];
    const mesh = dressing[0]?.group.children[0];
    let landmarkVerts = 0;
    let landmarkMeshes = 0;
    g.landmark?.traverse((o: any) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      landmarkVerts += o.geometry.attributes.position.count;
      landmarkMeshes++;
    });
    return {
      civ: g.players?.[0]?.civ ?? null,
      profile: g.mapProfile?.id ?? null,
      dressing: dressing.length,
      dressingVerts: mesh?.geometry?.attributes?.position?.count ?? 0,
      landmarkVerts,
      landmarkMeshes,
    };
  });
  expect(state.civ).toBe('chavin');
  expect(state.profile).toBe('andean_valley');
  expect(state.dressing).toBeGreaterThan(0);
  expect(state.dressingVerts).toBeGreaterThan(0);
  expect(state.landmarkMeshes).toBeGreaterThan(0);
  expect(state.landmarkVerts).toBeGreaterThan(500);
  expect(errors).toEqual([]);
});

test('the Chavín dressing is deterministic for the same seed', { tag: '@smoke' }, async ({ page }) => {
  const count = () =>
    page.evaluate(
      () =>
        (window as unknown as { game: any }).game.settlementDressing[0].group.children[0].geometry.attributes.position
          .count,
    );
  await boot(page);
  const first = await count();
  await boot(page);
  expect(await count()).toBe(first);
});
