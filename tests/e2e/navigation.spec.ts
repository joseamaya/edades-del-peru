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
    let worst = 0;
    for (const u of units) {
      const d = Math.hypot(u.pos.x - dest!.x, u.pos.z - dest!.z);
      if (d < 6) arrived++;
      worst = Math.max(worst, d);
    }
    return { total: units.length, arrived, worst };
  });
  // before the fix units boxed in at the start froze: they never left (≈87% arrived)
  expect(out.arrived).toBeGreaterThanOrEqual(out.total - 1);
  expect(out.worst).toBeLessThan(10);
});
