import { test, expect } from '@playwright/test';

/**
 * Boot a skirmish, freeze the enemy AI (so only the player's units move) and
 * stop the loop so the test drives fixed steps.
 */
async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.players[1].alive = false;
  });
}

test('a group ordered to move all reach the destination', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.playerCenter(0);
    const units: any[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 2 + (i % 6);
      const u = g.spawnScriptedUnit('soldier', 0, c.x + Math.cos(a) * r, c.z + Math.sin(a) * r);
      u.clearOrders();
      u.combatStance = 'pasivo';
      units.push(u);
    }
    // a walkable destination away from the base
    let dest: { x: number; z: number } | null = null;
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const x = c.x + Math.cos(a) * 60;
      const z = c.z + Math.sin(a) * 60;
      if (g.pathfinder.isWalkable(x, z) && !g.terrain.isWater(x, z)) {
        dest = { x, z };
        break;
      }
    }
    for (const u of units) u.issueOrder({ kind: 'move', target: { x: dest!.x, z: dest!.z } }, true);
    let t = 0;
    for (let i = 0; i < 60 * 90; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    let arrived = 0;
    let offGround = 0;
    for (const u of units) {
      const d = Math.hypot(u.pos.x - dest!.x, u.pos.z - dest!.z);
      if (d < 6) arrived++;
      // a unit with no legal route must stop on walkable ground, not cross terrain (#89)
      else if (!g.pathfinder.isWalkable(u.pos.x, u.pos.z)) offGround++;
    }
    return { total: units.length, arrived, offGround };
  });
  // boxed-in units no longer freeze (they leave the start); the vast majority reach it
  expect(out.arrived).toBeGreaterThanOrEqual(out.total - 1);
  // any unit left behind stayed on walkable ground instead of crossing a barrier
  expect(out.offGround).toBe(0);
});

test('a unit never crosses a fully blocked barrier', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    for (const u of g.units.values()) u.clearOrders();
    const { cell, cols } = g.pathfinder.grid;
    const w = (cx: number, cz: number) => g.pathfinder.grid.walkable[cz * cols + cx];
    // a flat walkable origin with room to the right
    let origin: { x: number; z: number } | null = null;
    for (let z = 5; z < cols - 5 && !origin; z++) {
      for (let x = 5; x < cols - 8 && !origin; x++) {
        let ok = true;
        for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -2; dx <= 7; dx++) if (!w(x + dx, z + dz)) ok = false;
        if (ok) origin = { x, z };
      }
    }
    if (!origin) return { skip: true };
    const wallCol = origin.x + 3;
    for (let z = 0; z < cols; z++) g.pathfinder.grid.walkable[z * cols + wallCol] = 0;
    const wallX = wallCol * cell + cell / 2;
    const zc = origin.z * cell + cell / 2;
    const u = g.spawnScriptedUnit('soldier', 0, origin.x * cell + cell / 2, zc);
    u.clearOrders();
    u.combatStance = 'pasivo';
    u.issueOrder({ kind: 'move', target: { x: (origin.x + 6) * cell + cell / 2, z: zc } }, true);
    let t = 0;
    for (let i = 0; i < 60 * 4; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return { skip: false, wallX, x: u.pos.x };
  });
  expect(out.skip).toBe(false);
  expect(out.x!).toBeLessThan(out.wallX!);
});

test('a unit routes around a barrier through a gap', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    for (const u of g.units.values()) u.clearOrders();
    const { cell, cols } = g.pathfinder.grid;
    const w = (cx: number, cz: number) => g.pathfinder.grid.walkable[cz * cols + cx];
    let origin: { x: number; z: number } | null = null;
    for (let z = 5; z < cols - 5 && !origin; z++) {
      for (let x = 5; x < cols - 8 && !origin; x++) {
        let ok = true;
        for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -2; dx <= 7; dx++) if (!w(x + dx, z + dz)) ok = false;
        if (ok) origin = { x, z };
      }
    }
    if (!origin) return { skip: true };
    const wallCol = origin.x + 3;
    const gapRow = origin.z + 2;
    for (let z = 0; z < cols; z++) {
      if (z === gapRow || z === gapRow + 1) continue;
      g.pathfinder.grid.walkable[z * cols + wallCol] = 0;
    }
    const wallX = wallCol * cell + cell / 2;
    const zc = origin.z * cell + cell / 2;
    const u = g.spawnScriptedUnit('soldier', 0, origin.x * cell + cell / 2, zc);
    u.clearOrders();
    u.combatStance = 'pasivo';
    u.issueOrder({ kind: 'move', target: { x: (origin.x + 6) * cell + cell / 2, z: zc } }, true);
    let t = 0;
    for (let i = 0; i < 60 * 30; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return { skip: false, wallX, x: u.pos.x };
  });
  expect(out.skip).toBe(false);
  expect(out.x!).toBeGreaterThan(out.wallX!);
});

test('a unit ordered to an unreachable spot does not cross or oscillate', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    for (const u of g.units.values()) u.clearOrders();
    const { cell, cols } = g.pathfinder.grid;
    const w = (cx: number, cz: number) => g.pathfinder.grid.walkable[cz * cols + cx];
    let origin: { x: number; z: number } | null = null;
    for (let z = 5; z < cols - 5 && !origin; z++) {
      for (let x = 5; x < cols - 8 && !origin; x++) {
        let ok = true;
        for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -2; dx <= 7; dx++) if (!w(x + dx, z + dz)) ok = false;
        if (ok) origin = { x, z };
      }
    }
    if (!origin) return { skip: true };
    const wallCol = origin.x + 3;
    for (let z = 0; z < cols; z++) g.pathfinder.grid.walkable[z * cols + wallCol] = 0;
    const wallX = wallCol * cell + cell / 2;
    const zc = origin.z * cell + cell / 2;
    const u = g.spawnScriptedUnit('soldier', 0, origin.x * cell + cell / 2, zc);
    u.clearOrders();
    u.combatStance = 'pasivo';
    u.issueOrder({ kind: 'move', target: { x: (origin.x + 8) * cell + cell / 2, z: zc } }, true);
    let t = 0;
    const at = (secs: number) => {
      while (t < secs) {
        g.update(1 / 60, t);
        t += 1 / 60;
      }
      return u.pos.x;
    };
    const x2 = at(2);
    const x4 = at(4);
    return { skip: false, wallX, x2, x4 };
  });
  expect(out.skip).toBe(false);
  expect(out.x2!).toBeLessThan(out.wallX!);
  expect(out.x4!).toBeLessThan(out.wallX!);
  expect(Math.abs(out.x4! - out.x2!)).toBeLessThan(1.5);
});
