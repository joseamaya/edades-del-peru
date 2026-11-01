import { test, expect } from '@playwright/test';

test('a group uses one shared path and arrives together', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const cols = g.pathfinder.grid.cols;
    const spot = g.pathfinder.nearestWalkablePoint(g.settings.mapSize / 2, g.settings.mapSize / 2, cols, 1);
    const goal = g.pathfinder.nearestWalkablePoint(spot.x + 30, spot.z, cols, 1);
    if (!spot || !goal) return { ok: false, reason: 'no spot' };
    const units = [];
    for (let i = 0; i < 60; i++) {
      const ring = 2 + Math.sqrt(i + 1) * 1.1;
      const ang = i * 2.399963229728653;
      units.push(g.spawnScriptedUnit('soldier', 0, spot.x + Math.cos(ang) * ring, spot.z + Math.sin(ang) * ring));
    }
    for (const u of units) u.clearOrders();
    const original = g.pathfinder.pathfind.bind(g.pathfinder);
    let calls = 0;
    g.pathfinder.pathfind = (...args: any[]) => {
      calls++;
      return original(...args);
    };
    g.selectUnits(units.map((u: any) => u.id));
    g.commandMoveToWorld(goal.x, goal.z);
    const pathCalls = calls;
    let t = 0;
    for (let i = 0; i < 60 * 25; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const distances = units.map((u: any) => Math.hypot(u.pos.x - goal.x, u.pos.z - goal.z));
    g.pathfinder.pathfind = original;
    return {
      ok: true,
      pathCalls,
      maxDistance: Math.max(...distances),
      spread: Math.max(...distances) - Math.min(...distances),
    };
  });
  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.pathCalls, 'one A* for the whole group').toBe(1);
  expect(out.maxDistance, 'the group reaches the destination').toBeLessThan(14);
  expect(out.spread, 'the formation stays together').toBeLessThan(16);
});

test('a group marches at the slowest member speed', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const cols = g.pathfinder.grid.cols;
    const spot = g.pathfinder.nearestWalkablePoint(g.settings.mapSize / 2, g.settings.mapSize / 2, cols, 1);
    const goal = g.pathfinder.nearestWalkablePoint(spot.x + 25, spot.z, cols, 1);
    const fast = g.spawnScriptedUnit('soldier', 0, spot.x, spot.z);
    const slow = g.spawnScriptedUnit('soldier', 0, spot.x + 2, spot.z);
    slow.stats = { ...slow.stats, speed: 1 };
    g.selectUnits([fast.id, slow.id]);
    g.commandMoveToWorld(goal.x, goal.z);
    let t = 0;
    for (let i = 0; i < 120; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return {
      fast: Math.hypot(fast.pos.x - spot.x, fast.pos.z - spot.z),
      slow: Math.hypot(slow.pos.x - spot.x, slow.pos.z - spot.z),
      limit: fast.moveSpeedLimit,
    };
  });
  expect(out.limit).toBe(1);
  expect(out.fast).toBeLessThan(2.6);
  expect(out.slow).toBeLessThan(2.6);
});
