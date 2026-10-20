import { test, expect, type Page } from '@playwright/test';

/** Boot a skirmish, stop the loop and disable the AI so the test drives fixed steps. */
async function boot(page: Page): Promise<void> {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.ais.length = 0;
    for (const u of g.units.values()) u.clearOrders();
  });
}

/**
 * Run a scenario on a clear patch with a full blocked column between the worker
 * (left) and the target (right). Samples every tick: did the unit enter a
 * blocked cell or cross the wall?
 */
async function runBarrierScenario(
  page: Page,
  orderKind: 'gather' | 'deliver' | 'build',
  target: 'farm' | 'market' | 'house',
  seconds = 10,
): Promise<{ crossed: boolean; offGround: boolean; maxX: number; wallX: number; settled: number }> {
  return page.evaluate(
    ({ orderKind, target, seconds }) => {
      const g = (window as unknown as { game: any }).game;
      const { cell, cols } = g.pathfinder.grid;
      const walkable = (cx: number, cz: number): number => g.pathfinder.grid.walkable[cz * cols + cx];
      const center = (c: number): number => c * cell + cell / 2;
      const findArea = (): { x: number; z: number } | null => {
        for (let z = 5; z < cols - 5; z++) {
          for (let x = 5; x < cols - 8; x++) {
            let ok = true;
            for (let dz = -3; dz <= 3 && ok; dz++)
              for (let dx = -2; dx <= 7; dx++) if (!walkable(x + dx, z + dz)) ok = false;
            if (ok) return { x, z };
          }
        }
        return null;
      };
      const area = findArea();
      if (!area) throw new Error('no clear area');
      const wx = center(area.x);
      const wz = center(area.z);
      const tx = center(area.x + 6);
      const wallCol = area.x + 3;
      const wallX = center(wallCol);

      const b = g.spawnScriptedBuilding(target, 0, tx, wz);
      if (target === 'house') {
        b.constructionComplete = false;
        b.constructionProgress = 0;
        b.beginConstruction();
      }
      const u = g.spawnScriptedUnit('worker', 0, wx, wz);
      u.pos.set(wx, g.terrain.getHeight(wx, wz), wz);
      u.clearOrders();
      if (orderKind === 'deliver') {
        u.currentResource = 'food';
        u.gatherCarry.food = 10;
      }
      // block the whole column between the worker and the target
      for (let z = 0; z < cols; z++) g.pathfinder.grid.walkable[z * cols + wallCol] = 0;

      u.issueOrder({ kind: orderKind, entityId: b.id }, true);
      let t = 0;
      let crossed = false;
      let offGround = false;
      let maxX = -Infinity;
      const steps = Math.round(seconds * 60);
      for (let i = 0; i < steps; i++) {
        g.update(1 / 60, t);
        t += 1 / 60;
        if (!g.pathfinder.isWalkable(u.pos.x, u.pos.z)) offGround = true;
        if (u.pos.x > wallX) crossed = true;
        maxX = Math.max(maxX, u.pos.x);
      }
      // stopped or gave up (no oscillation): movement over the last 3 seconds
      let settled = 0;
      let prev = { x: u.pos.x, z: u.pos.z };
      for (let i = 0; i < 3 * 60; i++) {
        g.update(1 / 60, t);
        t += 1 / 60;
        settled = Math.max(settled, Math.hypot(u.pos.x - prev.x, u.pos.z - prev.z));
        prev = { x: u.pos.x, z: u.pos.z };
        if (!g.pathfinder.isWalkable(u.pos.x, u.pos.z)) offGround = true;
        if (u.pos.x > wallX) crossed = true;
      }
      return { crossed, offGround, maxX, wallX, settled };
    },
    { orderKind, target, seconds },
  );
}

test('GATHER: a worker does not cross a barrier to reach a farm @smoke', async ({ page }) => {
  await boot(page);
  const out = await runBarrierScenario(page, 'gather', 'farm');
  expect(out.offGround, 'worker entered blocked terrain').toBe(false);
  expect(out.maxX, 'worker crossed the wall').toBeLessThan(out.wallX);
  expect(out.settled, 'worker should stop, not oscillate').toBeLessThan(0.5);
});

test('DELIVER: a loaded worker does not cross a barrier to reach the dropsite @smoke', async ({ page }) => {
  await boot(page);
  const out = await runBarrierScenario(page, 'deliver', 'market');
  expect(out.offGround, 'worker entered blocked terrain').toBe(false);
  expect(out.maxX, 'worker crossed the wall').toBeLessThan(out.wallX);
  expect(out.settled, 'worker should stop, not oscillate').toBeLessThan(0.5);
});

test('BUILD: a worker does not cross a barrier to reach the construction site @smoke', async ({ page }) => {
  await boot(page);
  const out = await runBarrierScenario(page, 'build', 'house');
  expect(out.offGround, 'worker entered blocked terrain').toBe(false);
  expect(out.maxX, 'worker crossed the wall').toBeLessThan(out.wallX);
  expect(out.settled, 'worker should stop, not oscillate').toBeLessThan(0.5);
});

test('separation never pushes a packed group into blocked terrain @smoke', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const { cell, cols } = g.pathfinder.grid;
    const walkable = (cx: number, cz: number): number => g.pathfinder.grid.walkable[cz * cols + cx];
    let area: { x: number; z: number } | null = null;
    for (let z = 5; z < cols - 5 && !area; z++) {
      for (let x = 5; x < cols - 8 && !area; x++) {
        let ok = true;
        for (let dz = -3; dz <= 3 && ok; dz++)
          for (let dx = -2; dx <= 8; dx++) if (!walkable(x + dx, z + dz)) ok = false;
        if (ok) area = { x, z };
      }
    }
    if (!area) throw new Error('no clear area');
    const wallCol = area.x + 4;
    const wallX = wallCol * cell + cell / 2;
    const cx = area.x * cell + cell / 2;
    const cz = area.z * cell + cell / 2;
    const units: any[] = [];
    for (let i = 0; i < 16; i++) {
      const u = g.spawnScriptedUnit('soldier', 0, cx + (i % 4) * 0.45, cz + Math.floor(i / 4) * 0.45);
      u.pos.set(cx + (i % 4) * 0.45, g.terrain.getHeight(cx, cz), cz + Math.floor(i / 4) * 0.45);
      u.clearOrders();
      u.combatStance = 'pasivo';
      units.push(u);
    }
    // block a full column and order the group beyond it (no valid route)
    for (let z = 0; z < cols; z++) g.pathfinder.grid.walkable[z * cols + wallCol] = 0;
    for (const u of units) {
      u.issueOrder({ kind: 'move', target: { x: cx + 8 * cell, z: cz } }, true);
    }
    let t = 0;
    let offGround = 0;
    let crossed = 0;
    for (let i = 0; i < 6 * 60; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
      for (const u of units) {
        if (!g.pathfinder.isWalkable(u.pos.x, u.pos.z)) offGround++;
        if (u.pos.x > wallX) crossed++;
      }
    }
    return { offGround, crossed, count: units.length };
  });
  expect(out.offGround, 'a unit was pushed into blocked terrain').toBe(0);
  expect(out.crossed, 'a unit crossed the wall').toBe(0);
  expect(out.count).toBe(16);
});

test('ESCAPE: a unit starting on a blocked cell can leave it', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const { cell, cols } = g.pathfinder.grid;
    const walkable = (cx: number, cz: number): number => g.pathfinder.grid.walkable[cz * cols + cx];
    let area: { x: number; z: number } | null = null;
    for (let z = 5; z < cols - 5 && !area; z++) {
      for (let x = 5; x < cols - 8 && !area; x++) {
        let ok = true;
        for (let dz = -2; dz <= 2 && ok; dz++)
          for (let dx = -1; dx <= 6; dx++) if (!walkable(x + dx, z + dz)) ok = false;
        if (ok) area = { x, z };
      }
    }
    if (!area) throw new Error('no clear area');
    const cx = area.x * cell + cell / 2;
    const cz = area.z * cell + cell / 2;
    const u = g.spawnScriptedUnit('soldier', 0, cx, cz);
    u.pos.set(cx, g.terrain.getHeight(cx, cz), cz);
    u.clearOrders();
    u.combatStance = 'pasivo';
    // the unit starts inside a blocked cell (controlled escape exception)
    g.pathfinder.grid.walkable[area.z * cols + area.x] = 0;
    const destX = (area.x + 5) * cell + cell / 2;
    u.issueOrder({ kind: 'move', target: { x: destX, z: cz } }, true);
    let t = 0;
    for (let i = 0; i < 6 * 60; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return {
      moved: Math.hypot(u.pos.x - cx, u.pos.z - cz),
      endWalkable: g.pathfinder.isWalkable(u.pos.x, u.pos.z),
      endX: u.pos.x,
      destX,
    };
  });
  expect(out.moved, 'the unit did not escape the blocked cell').toBeGreaterThan(2);
  expect(out.endWalkable, 'the unit did not end on walkable ground').toBe(true);
  expect(out.endX).toBeGreaterThan(out.destX - 8);
});
