import { test, expect } from '@playwright/test';

/** Boot a skirmish, stop the loop and move all human units to a far corner so the
 *  only actors are the ones each test spawns. */
async function bootSkirmish(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    for (const u of g.units.values()) {
      if (u.owner === 0) {
        u.pos.set(4, g.terrain.getHeight(4, 4), 4);
        u.clearOrders();
        u.combatStance = 'pasivo';
      }
    }
  });
}

test('the AI recalls idle soldiers to defend its base', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const aiCenter = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center');
    const defender = g.spawnScriptedUnit('soldier', 1, aiCenter.pos.x + 3, aiCenter.pos.z);
    defender.clearOrders();
    defender.combatStance = 'pasivo';
    const threat = g.spawnScriptedUnit('soldier', 0, aiCenter.pos.x + 20, aiCenter.pos.z);
    threat.clearOrders();
    threat.combatStance = 'pasivo';
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    const order = defender.orderQueue[0];
    return { kind: order?.kind ?? null, target: order?.entityId ?? null, threatId: threat.id };
  });
  expect(out.kind).toBe('attack');
  expect(out.target).toBe(out.threatId);
});

test('the AI retreats a badly wounded soldier toward its base', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const aiCenter = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center');
    const bx = aiCenter.pos.x;
    const bz = aiCenter.pos.z;
    // pick a direction where a path back to the base exists (some directions cross water)
    let ang = -1;
    for (let a = 0; a < 32; a++) {
      const t = (a / 32) * Math.PI * 2;
      const wx = bx + Math.cos(t) * 20;
      const wz = bz + Math.sin(t) * 20;
      if (!g.pathfinder.isWalkable(wx, wz)) continue;
      if (g.pathfinder.pathfind(wx, wz, bx, bz).length > 0) {
        ang = t;
        break;
      }
    }
    if (ang < 0) return null;

    const victim = g.spawnScriptedUnit('soldier', 0, bx + Math.cos(ang) * 28, bz + Math.sin(ang) * 28);
    victim.clearOrders();
    victim.combatStance = 'pasivo';
    const wounded = g.spawnScriptedUnit('soldier', 1, bx + Math.cos(ang) * 20, bz + Math.sin(ang) * 20);
    wounded.hp = wounded.maxHp * 0.2;
    wounded.issueOrder({ kind: 'attack', entityId: victim.id }, true);
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    const order = wounded.orderQueue[0];
    return { kind: order?.kind ?? null, target: order?.target ?? null, base: { x: bx, z: bz } };
  });

  expect(out).not.toBeNull();
  expect(out!.kind).toBe('move');
  expect(out!.target).not.toBeNull();
  expect(Math.hypot(out!.target.x - out!.base.x, out!.target.z - out!.base.z)).toBeLessThan(1);
});

test('the AI sends its scout to explore', async ({ page }) => {
  await bootSkirmish(page);
  const order = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const scout = [...g.units.values()].find((u: any) => u.owner === 1 && u.kind === 'scout');
    scout.clearOrders();
    let t = 0;
    for (let i = 0; i < 420; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    return scout.orderQueue.map((o: any) => o.kind);
  });
  expect(order).toContain('patrol');
});
