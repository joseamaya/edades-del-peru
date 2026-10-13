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
      const before = totalWood();
      const bankBefore = p.resources.wood;
      const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
      const node = [...g.resourceNodes.values()].find((n: any) => !n.dead && n.resource === 'wood');
      worker.issueOrder({ kind: 'gather', entityId: node.id }, true);
      let t = 0;
      for (let i = 0; i < 60 * 60; i++) {
        g.update(1 / 60, t);
        t += 1 / 60;
      }
      return { before, after: totalWood(), bankBefore, bankAfter: p.resources.wood };
    });
    // the wood gathered into the banks is exactly what left the nodes (nothing created or lost)
    expect(out.after).toBeCloseTo(out.before, 3);
    // and the loop is meaningful: the worker actually delivered something
    expect(out.bankAfter).toBeGreaterThan(out.bankBefore);
  },
);

test('cancelling a queued unit refunds its full cost', async ({ page }) => {
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
  // queuing spends the unit cost...
  expect(out.queued.food).toBeLessThan(out.before.food);
  expect(out.queued.wood).toBeLessThan(out.before.wood);
  // ...and cancelling restores it exactly (no duplication, no loss)
  expect(out.cancelled).toEqual(out.before);
  expect(out.queueLength).toBe(0);
});
