import { test, expect } from '@playwright/test';

async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('walls block everyone and gates only open for their owner', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.players[0].resources = { food: 5000, wood: 5000, silver: 5000, stone: 5000 };
    const c = g.playerCenter(0);
    const spot = g.pathfinder.nearestWalkablePoint(c.x + 18, c.z, g.pathfinder.grid.cols, 1);
    if (!spot) return { ok: false, reason: 'no spot' };
    g.executeCommand({ kind: 'place', building: 'wall', x: spot.x, z: spot.z });
    const gateSpot = g.pathfinder.nearestWalkablePoint(spot.x + 4, spot.z, g.pathfinder.grid.cols, 1) ?? spot;
    g.executeCommand({ kind: 'place', building: 'gate', x: gateSpot.x, z: gateSpot.z });
    return {
      ok: true,
      wall: { x: spot.x, z: spot.z, own: g.pathfinder.isWalkable(spot.x, spot.z, 0) },
      gate: {
        x: gateSpot.x,
        z: gateSpot.z,
        own: g.pathfinder.isWalkable(gateSpot.x, gateSpot.z, 0),
        enemy: g.pathfinder.isWalkable(gateSpot.x, gateSpot.z, 1),
      },
      buildings: [...g.buildings.values()].filter((b: any) => b.owner === 0).map((b: any) => b.kind),
    };
  });
  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.wall.own, 'walls block their owner too').toBe(false);
  expect(out.gate.own, 'the owner crosses its gate').toBe(true);
  expect(out.gate.enemy, 'enemies cannot cross the gate').toBe(false);
  expect(out.buildings).toContain('wall');
  expect(out.buildings).toContain('gate');
});

test('garrisoned units add tower projectiles', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.players[0].resources = { food: 9000, wood: 9000, silver: 9000, stone: 9000 };
    const c = g.playerCenter(0);
    const spot = g.pathfinder.nearestWalkablePoint(c.x + 22, c.z + 6, g.pathfinder.grid.cols, 1);
    if (!spot) return { ok: false, reason: 'no spot' };
    g.executeCommand({ kind: 'place', building: 'tower', x: spot.x, z: spot.z });
    const tower = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'tower');
    if (!tower) return { ok: false, reason: 'no tower' };
    tower.addBuildProgress(9999);
    const enemy = g.spawnScriptedUnit('soldier', 1, spot.x + 7, spot.z);
    enemy.stats = { ...enemy.stats, speed: 0, attack: 0 };
    const countShots = (): number => {
      tower.attackCooldown = 0;
      const before = g.projectiles.length;
      g.update(1 / 60, 0);
      return g.projectiles.length - before;
    };
    const empty = countShots();
    const men = [0, 1, 2].map(() => g.spawnScriptedUnit('soldier', 0, spot.x, spot.z));
    for (const m of men) tower.garrisonUnit(m.id, 0);
    const garrisoned = countShots();
    return { ok: true, empty, garrisoned, garrisonSize: tower.garrisonedIds.length };
  });
  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.empty).toBe(1);
  expect(out.garrisonSize).toBe(3);
  expect(out.garrisoned, 'each garrison unit adds a projectile').toBe(4);
});

test('a dragged wall line closes the path', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.players[0].resources = { food: 5000, wood: 5000, silver: 5000, stone: 5000 };
    const c = g.playerCenter(0);
    const spot = g.pathfinder.nearestWalkablePoint(c.x + 20, c.z - 12, g.pathfinder.grid.cols, 1);
    if (!spot) return { ok: false, reason: 'no spot' };
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    g.selectUnits([worker.id]);
    g.startPlacement('wall');
    g.commitWallLine({ x: spot.x - 10, z: spot.z }, { x: spot.x + 10, z: spot.z });
    g.cancelPlacement();
    const walls = [...g.buildings.values()].filter((b: any) => b.owner === 0 && b.kind === 'wall');
    const blocked = !g.pathfinder.isWalkable(spot.x, spot.z, 0);
    return { ok: true, walls: walls.length, blocked };
  });
  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.walls).toBeGreaterThanOrEqual(9);
  expect(out.blocked).toBe(true);
});
