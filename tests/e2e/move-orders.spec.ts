import { expect, test } from '@playwright/test';

const URL = '/?play=1&civ=caral&period=0&map=coast&seed=777&fog=0&low=1&noloop=1';

test('a move order into water ends on the nearest shore and frees the unit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const pathfinder = g.pathfinder;
    const main = pathfinder.mainComponent();
    const size = g.settings.mapSize;
    // A sea cell with a main-component shore within a short walk, so the order is a normal player click.
    let water: { x: number; z: number } | null = null;
    let shore: { x: number; z: number } | null = null;
    for (let x = 4; x < size - 4 && !water; x += 2) {
      for (let z = 4; z < size - 4; z += 2) {
        if (!g.terrain.isWater(x, z)) continue;
        const safe = pathfinder.nearestWalkablePoint(x, z, 0, main) as { x: number; z: number } | null;
        if (!safe || Math.hypot(safe.x - x, safe.z - z) > 8) continue;
        water = { x, z };
        shore = safe;
        break;
      }
    }
    if (!water || !shore) return { ok: false as const, reason: 'no coastal water found' };

    const scout = g.spawnScriptedUnit('scout', 0, shore.x, shore.z);
    g.executeCommand({ kind: 'order', unitIds: [scout.id], order: { kind: 'move', target: water } });
    const ordered = scout.orderQueue[0]?.target as { x: number; z: number } | undefined;
    let t = 0;
    for (let i = 0; i < 200 && scout.isBusy(); i++) {
      g.update(0.1, t);
      t += 0.1;
    }
    return {
      ok: true as const,
      water,
      ordered,
      busy: scout.isBusy() as boolean,
      inWater: g.terrain.isWater(scout.pos.x, scout.pos.z) as boolean,
      distance: Math.hypot(scout.pos.x - water.x, scout.pos.z - water.z),
      snapDistance: ordered ? Math.hypot(ordered.x - water.x, ordered.z - water.z) : -1,
    };
  });
  expect(out.ok, out.ok ? '' : out.reason).toBe(true);
  if (!out.ok) return;
  expect(out.snapDistance, 'the destination moves to the shore').toBeGreaterThan(0);
  expect(out.busy, 'the order ends once the shore is reached').toBe(false);
  expect(out.inWater, 'the unit never stands in the sea').toBe(false);
  expect(out.distance, 'it stops close to the clicked spot').toBeLessThan(12);
  expect(errors).toEqual([]);
});
