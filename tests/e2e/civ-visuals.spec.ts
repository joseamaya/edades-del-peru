import { test, expect } from '@playwright/test';

/**
 * Faction visual differentiation: two coetaneous civilizations in a match must
 * build visibly different models. Structural check (vertex counts), not pixel
 * snapshots — see `yarn shot` for the manual visual review.
 */
test('coetaneous civilizations build different-looking bases', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const verts = (group: any): number => {
      let n = 0;
      group.traverse((o: any) => {
        if (o.isMesh && o.geometry?.attributes?.position) n += o.geometry.attributes.position.count;
      });
      return n;
    };
    const centerOf = (owner: number) =>
      [...g.buildings.values()].find((b: any) => b.owner === owner && b.kind === 'center' && !b.dead) as any;
    const c0 = centerOf(0);
    const c1 = centerOf(1);
    return {
      civ0: g.players[0].civ,
      civ1: g.players[1].civ,
      v0: c0 ? verts(c0.view.group) : 0,
      v1: c1 ? verts(c1.view.group) : 0,
    };
  });
  expect(out.civ0).not.toBe(out.civ1);
  expect(out.v0).toBeGreaterThan(500);
  expect(out.v1).toBeGreaterThan(500);
  expect(out.v0, 'the two civilizations must not look identical').not.toBe(out.v1);
});
