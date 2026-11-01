import { test, expect } from '@playwright/test';

/**
 * Regression guard for isolated spawn pockets (issue #252): initial units and
 * newly trained units must start in the main walkable component, or they can never
 * receive a valid first order.
 */
const CASES = [
  [777, 'coast'],
  [779, 'andes'],
  [783, 'jungle'],
  [785, 'altiplano'],
] as const;

for (const [seed, map] of CASES) {
  test(`initial and trained units spawn in the main component (seed ${seed}, ${map})`, async ({ page }) => {
    await page.goto(`/?play=1&seed=${seed}&map=${map}&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    const out = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      const main = g.pathfinder.mainComponent();
      const componentOf = (u: any): number => g.pathfinder.componentAt(u.pos.x, u.pos.z);
      const isolated = [...g.units.values()]
        .filter((u: any) => !u.dead && componentOf(u) !== main)
        .map((u: any) => ({ id: u.id, owner: u.owner, x: Math.round(u.pos.x), z: Math.round(u.pos.z) }));

      const centers = [0, 1]
        .map((owner) => [...g.buildings.values()].find((b: any) => b.owner === owner && b.kind === 'center' && !b.dead))
        .filter(Boolean);
      if (centers.length < 2) return { ok: false, reason: 'missing player centers', isolated };
      for (const owner of [0, 1]) g.players[owner].populationCap = 500;
      let spawned = 0;
      const bad: Array<{ id: number; x: number; z: number }> = [];
      const trained: any[] = [];
      for (const center of centers) {
        for (let i = 0; i < 10; i++) {
          const before = new Set(g.units.keys());
          if (!g.unitSpawn(center.id, 'worker', null, false)) continue;
          const unit = [...g.units.values()].find((u: any) => !before.has(u.id));
          if (!unit) continue;
          spawned++;
          trained.push(unit);
          if (componentOf(unit) !== main)
            bad.push({ id: unit.id, x: Math.round(unit.pos.x), z: Math.round(unit.pos.z) });
        }
      }
      const routeFailures = trained
        .map((unit) => {
          const center = g.playerCenter(unit.owner);
          const goal = g.pathfinder.nearestWalkablePoint(center.x + 20, center.z, g.pathfinder.grid.cols, main);
          if (!goal) return { id: unit.id, reason: 'no goal' };
          const path = unit.ctx.findPath(unit.pos.x, unit.pos.z, goal.x, goal.z);
          return path.length > 0
            ? null
            : {
                id: unit.id,
                reason: 'no route to first move',
                from: [Math.round(unit.pos.x), Math.round(unit.pos.z)],
                goal: [Math.round(goal.x), Math.round(goal.z)],
                comp: g.pathfinder.componentAt(unit.pos.x, unit.pos.z),
                goalComp: g.pathfinder.componentAt(goal.x, goal.z),
                main,
              };
        })
        .filter(Boolean);
      return { ok: true, main, isolated, spawned, bad, routeFailures };
    });

    expect(out.ok, out.reason ?? '').toBe(true);
    expect(out.isolated, 'no boot unit may start outside the main component').toEqual([]);
    expect(out.spawned, 'the scenario should have trained 20 units').toBe(20);
    expect(out.bad, 'no trained unit may spawn outside the main component').toEqual([]);
    expect(out.routeFailures, 'every trained unit needs a route for its first order').toEqual([]);
  });
}

test('a ringed building still spawns into the main component', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead);
    if (!center) return { ok: false, reason: 'no player center' };
    // Seal the ring the old spawn radius used, leaving only a pocket between the
    // building and the props; the outer landmass stays in the main component.
    const ring = center.radius + 2.5;
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      g.pathfinder.addObstacle({
        x: center.pos.x + Math.cos(angle) * ring,
        z: center.pos.z + Math.sin(angle) * ring,
        radius: 1.3,
      });
    }
    const main = g.pathfinder.mainComponent();
    g.players[0].populationCap = 500;
    const bad: Array<{ id: number; x: number; z: number }> = [];
    let spawned = 0;
    for (let i = 0; i < 5; i++) {
      const before = new Set(g.units.keys());
      if (!g.unitSpawn(center.id, 'worker', null, false)) continue;
      const unit = [...g.units.values()].find((u: any) => !before.has(u.id));
      if (!unit) continue;
      spawned++;
      if (g.pathfinder.componentAt(unit.pos.x, unit.pos.z) !== main) {
        bad.push({ id: unit.id, x: Math.round(unit.pos.x), z: Math.round(unit.pos.z) });
      }
    }
    return { ok: true, spawned, bad };
  });

  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.spawned).toBe(5);
  expect(out.bad, 'ringed buildings must still use the main component').toEqual([]);
});
