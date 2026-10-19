import { test, expect } from '@playwright/test';

test('ambient props and fauna are placed at boot', async ({ page }) => {
  await page.goto('/?civ=inca&period=5&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const meshes = [...g.props.meshes.values()] as { count: number }[];
    const fauna = g.wildlife.animals as {
      name: string;
      group: { children: unknown[] };
      legs: unknown[];
      wings: unknown[];
    }[];
    return {
      propKinds: meshes.length,
      instances: meshes.reduce((n, m) => n + m.count, 0),
      fauna: fauna.length,
      articulated: fauna.every((a) => a.group.children.length > 1),
      maxLimbs: fauna.reduce((n, a) => Math.max(n, a.legs.length + a.wings.length), 0),
    };
  });
  expect(out.propKinds).toBe(4);
  expect(out.instances).toBeGreaterThan(0);
  expect(out.fauna).toBeGreaterThan(0);
  expect(out.articulated).toBe(true); // body + animated limbs/wings
  expect(out.maxLimbs).toBeGreaterThanOrEqual(2);
});

test('buildings grow while under construction', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const b = [...g.buildings.values()].find((x: any) => x.owner === 0 && x.kind === 'center');
    b.beginConstruction();
    b.addBuildProgress(1);
    b.update(1 / 60, 0);
    const growing = b.view.group.scale.y;
    b.addBuildProgress(9999);
    b.update(1 / 60, 0);
    return { growing, complete: b.view.group.scale.y };
  });
  expect(out.growing).toBeLessThan(0.5);
  expect(out.complete).toBe(1);
});
