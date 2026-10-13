import { test, expect } from '@playwright/test';

async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
  });
}

test(
  'gathering conserves wood between nodes, the worker load and the player bank',
  { tag: '@smoke' },
  async ({ page }) => {
    await boot(page);
    const out = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      // Freeze the AI's macromanagement so it does not spend wood on buildings (its
      // workers keep gathering), and make the invariant global: resource nodes are
      // shared by both players. Wood only moves node -> carry -> bank.
      g.players[1].alive = false;
      const p = g.players[0];
      const totalWood = (): number => {
        let total = 0;
        for (const pl of g.players) total += pl.resources.wood;
        for (const n of g.resourceNodes.values()) {
          if (!n.dead && n.resource === 'wood') total += n.amount;
        }
        for (const u of g.units.values()) {
          if (!u.dead && !u.garrisonedIn) total += u.gatherCarry.wood;
        }
        return total;
      };
      // isolate the exact worker/node under test: idle every P0 worker, then send the
      // nearest one to the wood node closest to the player base (away from P1's base)
      const center = g.playerCenter(0);
      const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead);
      for (const w of workers) w.clearOrders();
      const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.z - b.z);
      const node = [...g.resourceNodes.values()]
        .filter((n: any) => !n.dead && n.resource === 'wood')
        .sort((a: any, b: any) => dist(a.pos, center) - dist(b.pos, center))[0];
      const worker = workers.sort((a, b) => dist(a.pos, node.pos) - dist(b.pos, node.pos))[0];

      // no unit is born during the window (a queue left by the AI before the freeze
      // would complete inside the loop), so an unchanged unit count proves none died
      for (const b of g.buildings.values()) {
        b.productionQueue.length = 0;
        b.researchQueue.length = 0;
      }
      const before = totalWood();
      const bankBefore = p.resources.wood;
      const aliveBefore = [...g.units.values()].filter((u: any) => !u.dead).length;
      const nodeBefore = node.amount;
      worker.issueOrder({ kind: 'gather', entityId: node.id }, true);
      let t = 0;
      for (let i = 0; i < 60 * 60; i++) {
        g.update(1 / 60, t);
        t += 1 / 60;
      }
      const aliveAfter = [...g.units.values()].filter((u: any) => !u.dead).length;
      return {
        before,
        after: totalWood(),
        bankBefore,
        bankAfter: p.resources.wood,
        nodeBefore,
        nodeAfter: node.dead ? 0 : node.amount,
        aliveBefore,
        aliveAfter,
      };
    });
    // no unit died while carrying (which would leak its load outside the invariant)
    expect(out.aliveAfter).toBe(out.aliveBefore);
    // wood gathered into the banks is exactly what left the nodes (nothing created or lost)
    expect(out.after).toBeCloseTo(out.before, 3);
    // the ordered node was actually harvested and the worker delivered into the bank
    expect(out.nodeAfter).toBeLessThan(out.nodeBefore);
    expect(out.bankAfter).toBeGreaterThan(out.bankBefore);
  },
);

test('cancelling a queued unit refunds its full cost', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.playerCenter(0);
    const barracks = g.spawnScriptedBuilding('barracks', 0, c.x + 8, c.z);
    g.players[0].resources = { food: 1000, wood: 1000, silver: 1000, stone: 1000 };
    const before = { ...g.players[0].resources };
    g.trainUnit(barracks.id, 'soldier');
    const queued = { ...g.players[0].resources };
    g.cancelProduction(barracks.id, 0);
    const cancelled = { ...g.players[0].resources };
    return { before, queued, cancelled, queueLength: barracks.productionQueue.length };
  });
  expect(out.queued.food).toBeLessThan(out.before.food);
  expect(out.queued.wood).toBeLessThan(out.before.wood);
  expect(out.cancelled).toEqual(out.before);
  expect(out.queueLength).toBe(0);
});
