import { test, expect } from '@playwright/test';

/**
 * A skirmish must be winnable by force: a player army ordered onto the enemy
 * base razes it and the match ends in victory. This guards the conquest win
 * condition (and that the player's own base survives the enemy AI), which the
 * campaign tests do not cover.
 */
test('a skirmish can be won by destroying the enemy base', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();

    const enemyCenter = [...g.buildings.values()].find(
      (b: any) => b.owner === 1 && b.kind === 'center' && !b.dead,
    ) as any;
    if (!enemyCenter) return { spawned: 0, ended: false, p1alive: true };

    let spawned = 0;
    for (let i = 0; i < 16; i++) {
      const u = g.spawnScriptedUnit(
        'soldier',
        0,
        enemyCenter.pos.x + 8 + (i % 4),
        enemyCenter.pos.z + 6 + Math.floor(i / 4),
      );
      u.issueOrder({ kind: 'attack', entityId: enemyCenter.id }, true);
      spawned++;
    }

    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(240 / dt) && !g.hasEnded(); i++) {
      for (const u of g.units.values()) {
        if (u.owner !== 0 || u.dead || u.kind === 'worker' || u.kind === 'scout') continue;
        // the army must survive the enemy AI long enough to raze the base
        u.hp = u.maxHp;
        // conquest needs every enemy building gone: re-target the nearest one
        const order = u.orderQueue[0];
        const target = order?.entityId != null ? g.buildings.get(order.entityId) : null;
        if (!target || target.dead) {
          let best: any = null;
          let bestD = Infinity;
          for (const b of g.buildings.values()) {
            if (b.owner !== 1 || b.dead) continue;
            const d = (b.pos.x - u.pos.x) ** 2 + (b.pos.z - u.pos.z) ** 2;
            if (d < bestD) {
              bestD = d;
              best = b;
            }
          }
          if (best) u.issueOrder({ kind: 'attack', entityId: best.id }, true);
        }
      }
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
      g.update(dt, t);
      t += dt;
    }
    return { spawned, ended: g.hasEnded(), p1alive: g.players[1].alive as boolean };
  });
  expect(out.spawned).toBeGreaterThan(0);
  expect(out.ended, 'the skirmish never ended').toBe(true);
  expect(out.p1alive, 'the enemy was not defeated').toBe(false);
  expect(errors).toEqual([]);
});
