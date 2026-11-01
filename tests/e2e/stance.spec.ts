import { test, expect } from '@playwright/test';

async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('a defensive unit stops at its leash and returns to its origin', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const cols = g.pathfinder.grid.cols;
    const main = g.pathfinder.mainComponent();
    const spot = g.pathfinder.nearestWalkablePoint(g.settings.mapSize * 0.5, g.settings.mapSize * 0.2, cols, main);
    if (!spot) return { ok: false, reason: 'no spot' };
    const soldier = g.spawnScriptedUnit('soldier', 0, spot.x, spot.z);
    const enemy = g.spawnScriptedUnit('soldier', 1, spot.x + 4, spot.z);
    soldier.stats = { ...soldier.stats, attack: 0 };
    enemy.stats = { ...enemy.stats, speed: 0, attack: 0, hp: 1000 };
    enemy.hp = 1000;
    soldier.setCombatStance('defensivo');
    const origin = { ...spot };
    soldier.issueOrder({ kind: 'attack', entityId: enemy.id });

    const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);
    let t = 0;
    const step = (seconds: number): void => {
      for (let i = 0; i < 60 * seconds; i++) {
        g.update(1 / 60, t);
        t += 1 / 60;
      }
    };
    step(1);
    const chased = dist(soldier.pos, origin);
    enemy.pos.set(spot.x + 40, enemy.pos.y, spot.z);
    enemy.snapToGround();
    step(12);
    const far = g.pathfinder.nearestWalkablePoint(spot.x + 40, spot.z, cols, main) ?? { x: spot.x + 40, z: spot.z };
    return {
      ok: true,
      origin,
      chased,
      distanceToOrigin: dist(soldier.pos, origin),
      distanceToEnemy: dist(soldier.pos, far),
      stance: soldier.combatStance,
      leash: soldier.leashOrigin,
      busy: soldier.isBusy(),
    };
  });

  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.chased, 'the unit should defend by closing some distance').toBeGreaterThan(0.5);
  expect(out.stance).toBe('defensivo');
  expect(out.leash).not.toBeNull();
  expect(out.distanceToOrigin, 'defensive units return to their anchor').toBeLessThan(3);
  expect(out.distanceToEnemy, 'defensive units do not chase beyond the leash').toBeGreaterThan(15);
});

test('an aggressive unit keeps pursuing a fleeing enemy', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const cols = g.pathfinder.grid.cols;
    const main = g.pathfinder.mainComponent();
    const spot = g.pathfinder.nearestWalkablePoint(g.settings.mapSize * 0.5, g.settings.mapSize * 0.2, cols, main);
    if (!spot) return { ok: false, reason: 'no spot' };
    const soldier = g.spawnScriptedUnit('soldier', 0, spot.x, spot.z);
    const enemy = g.spawnScriptedUnit('soldier', 1, spot.x + 4, spot.z);
    soldier.stats = { ...soldier.stats, attack: 0 };
    enemy.stats = { ...enemy.stats, speed: 0, attack: 0, hp: 1000 };
    enemy.hp = 1000;
    soldier.issueOrder({ kind: 'attack', entityId: enemy.id });
    let t = 0;
    for (let i = 0; i < 60; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    enemy.pos.set(spot.x + 30, enemy.pos.y, spot.z);
    enemy.snapToGround();
    for (let i = 0; i < 60 * 8; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return { ok: true, distanceToOrigin: Math.hypot(soldier.pos.x - spot.x, soldier.pos.z - spot.z) };
  });

  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.distanceToOrigin, 'aggressive units follow the target away from the origin').toBeGreaterThan(10);
});

test('saving and loading keeps the defensive anchor', async ({ page }) => {
  await boot(page);
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead);
    if (!worker) return { ok: false, reason: 'no unit' };
    worker.setCombatStance('defensivo');
    const origin = { x: Math.round(worker.pos.x), z: Math.round(worker.pos.z) };
    g.saveMatch();
    return { ok: true, id: worker.id, origin };
  });
  expect(before.ok, before.reason ?? '').toBe(true);

  await page.goto('/?load=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.units?.size > 0, null, {
    timeout: 30_000,
  });
  const after = await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const u = g.units.get(id);
    return { stance: u?.combatStance, leash: u?.leashOrigin };
  }, before.id);

  expect(after.stance).toBe('defensivo');
  expect(after.leash).not.toBeNull();
  expect(Math.abs(after.leash.x - before.origin.x)).toBeLessThan(2);
  expect(Math.abs(after.leash.z - before.origin.z)).toBeLessThan(2);
});
