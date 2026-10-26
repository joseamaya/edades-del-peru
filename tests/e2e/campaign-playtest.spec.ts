import { test, expect } from '@playwright/test';

/**
 * A bounded campaign playtest that does not satisfy objectives directly.
 * It issues ordinary gather commands to the player's workers and lets the
 * economy and the enemy AI run; the enemy must keep producing units while the
 * player's gatherers bring resources home.
 */
test('plays m7 with real gathering and enemy AI without objective cheats', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m7_tupac_amaru&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();

    const nodes = [...g.resourceNodes.values()].filter((n: any) => !n.dead && n.resource === 'wood') as any[];
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any[];
    const nearest = (worker: any) =>
      nodes.reduce((best: any, node: any) => {
        if (!best) return node;
        const dx = node.pos.x - worker.pos.x;
        const dz = node.pos.z - worker.pos.z;
        const bx = best.pos.x - worker.pos.x;
        const bz = best.pos.z - worker.pos.z;
        return dx * dx + dz * dz < bx * bx + bz * bz ? node : best;
      }, null);

    const before = { ...g.players[0].resources };
    for (const worker of workers) {
      const node = nearest(worker);
      if (node) {
        g.executeCommand(
          { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: node.id }, clear: true },
          false,
        );
      }
    }

    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(45 / dt) && !g.mission.ended; i++) {
      g.update(dt, t);
      t += dt;
    }

    const enemyWorkers = [...g.units.values()].filter(
      (u: any) => u.owner === 1 && u.kind === 'worker' && !u.dead,
    ) as any[];
    return {
      before,
      after: { ...g.players[0].resources },
      workers: workers.length,
      enemyWorkers: enemyWorkers.length,
      enemyWorking: enemyWorkers.some((u: any) => u.orderQueue.some((o: any) => o.kind === 'gather')),
      enemyCreated: g.players[1].stats.created as number,
      ended: g.mission.ended as boolean,
      won: g.mission.won as boolean | null,
    };
  });

  expect(out.workers).toBeGreaterThan(0);
  expect(out.after.wood, 'the player economy did not gather wood').toBeGreaterThan(out.before.wood);
  expect(out.enemyWorkers, 'the AI lost its economy').toBeGreaterThan(0);
  expect(out.enemyWorking, 'the AI did not assign gatherers').toBe(true);
  expect(out.enemyCreated, 'the AI did not train units').toBeGreaterThanOrEqual(1);
  expect(out.ended).toBe(false);
  expect(out.won).toBe(null);
  expect(errors).toEqual([]);
});
