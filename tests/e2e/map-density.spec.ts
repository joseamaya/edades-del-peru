import { test, expect } from '@playwright/test';

const CASES = [
  [777, 'coast'],
  [779, 'andes'],
  [783, 'jungle'],
] as const;

for (const [seed, map] of CASES) {
  test(`resources and base spacing are playable (${map}, seed ${seed})`, async ({ page }) => {
    await page.goto(`/?play=1&seed=${seed}&map=${map}&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    const out = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      const nodes = [...g.resourceNodes.values()].filter((n: any) => !n.dead);
      const wood = nodes.filter((n: any) => n.kind === 'tree').reduce((sum: number, n: any) => sum + n.amount, 0);
      const centers = g.players.map((p: any) => g.playerCenter(p.id));
      const distance = Math.hypot(centers[0].x - centers[1].x, centers[0].z - centers[1].z);
      const near = (owner: number, kind: string): number => {
        const c = centers[owner];
        return nodes.filter((n: any) => n.kind === kind && Math.hypot(n.pos.x - c.x, n.pos.z - c.z) <= 22).length;
      };
      const rings = g.players.map((p: any) => ({
        trees: near(p.id, 'tree'),
        berry: near(p.id, 'berry'),
        hunt: near(p.id, 'hunt'),
        silver: near(p.id, 'mine'),
        stone: near(p.id, 'well'),
      }));
      return {
        wood,
        distance,
        diagonal: Math.SQRT2 * g.settings.mapSize,
        rings,
        trees: nodes.filter((n: any) => n.kind === 'tree').length,
      };
    });
    expect(out.wood, 'wood total').toBeGreaterThan(40_000);
    expect(out.trees, 'tree nodes').toBeGreaterThan(150);
    expect(out.distance, 'base separation').toBeGreaterThanOrEqual(out.diagonal * 0.44);
    for (const ring of out.rings) {
      expect(ring.trees, 'opening forest').toBeGreaterThanOrEqual(3);
      expect(ring.berry, 'opening berries').toBeGreaterThanOrEqual(1);
      expect(ring.hunt, 'opening hunt').toBeGreaterThanOrEqual(1);
      expect(ring.silver, 'opening silver').toBeGreaterThanOrEqual(1);
      expect(ring.stone, 'opening stone').toBeGreaterThanOrEqual(1);
    }
  });
}
