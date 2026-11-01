import { test, expect } from '@playwright/test';

/**
 * Regression guards for the "worker abandons gathering after the first delivery"
 * playtest bug: the one-shot approach fallback was only reset by `clearOrders`, so
 * the second trip had no fallback and dropped the order, and the 1.5 s no-route
 * grace gave up before a crowded node could free a stand point.
 */
test('a gather order keeps its approach fallback after delivering', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const worker = [...g.units.values()].find(
      (u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead && u.orderQueue.length === 0,
    );
    const node = [...g.resourceNodes.values()].find((n: any) => !n.dead && !n.depleted && n.amount > 40);
    const dropsite = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.isDropsite && !b.dead);
    if (!worker || !node || !dropsite) return { ok: false, reason: 'missing worker/node/dropsite' };

    worker.issueOrder({ kind: 'gather', entityId: node.id });
    // Simulate the state after a first trip spent its one-shot fallback.
    worker.approachTried = true;
    worker.currentResource = node.resource;
    worker.gatherCarry = { food: 0, wood: 0, silver: 0, stone: 0, [node.resource]: worker.carryCapacity };
    worker.pos.copy(dropsite.pos);
    worker.pos.x += (dropsite.radius ?? 1) + 1;
    worker.snapToGround();

    let t = 0;
    for (let i = 0; i < 60 * 3; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }

    return {
      ok: true,
      kind: worker.orderQueue[0]?.kind ?? null,
      approachTried: worker.approachTried,
      carried: worker.gatherCarry.food + worker.gatherCarry.wood + worker.gatherCarry.silver + worker.gatherCarry.stone,
    };
  });

  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.carried, 'the load should have been delivered').toBe(0);
  expect(out.kind, 'the gather order must survive the delivery').toBe('gather');
  expect(out.approachTried, 'a new gathering trip must get a fresh approach fallback').toBe(false);
});

test('a crowded node yields after the economy grace and switches to another node', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead);
    if (!worker) return { ok: false, reason: 'no worker' };
    // Pick a resource type with at least two nodes so a fallback exists.
    const byResource = new Map<string, any[]>();
    for (const n of g.resourceNodes.values()) {
      if (n.dead || n.depleted || !(n.amount > 0)) continue;
      const list = byResource.get(n.resource) ?? [];
      list.push(n);
      byResource.set(n.resource, list);
    }
    const pair = [...byResource.values()].find((list) => list.length >= 2);
    if (!pair) return { ok: false, reason: 'no duplicate resource type' };
    const first = pair[0];
    const second = pair[1];

    worker.issueOrder({ kind: 'gather', entityId: first.id });
    const oldFindPath = worker.ctx.findPath;
    const oldApproach = worker.ctx.findApproachPath;
    const oldWalkable = worker.ctx.isWalkable;
    worker.ctx.findPath = () => [];
    worker.ctx.isWalkable = (x: number, z: number) => x === worker.pos.x && z === worker.pos.z;
    worker.ctx.findApproachPath = (_sx: number, _sz: number, tx: number, tz: number) =>
      tx === first.pos.x && tz === first.pos.z ? [] : [{ x: tx + 1, z: tz }];

    const step = (seconds: number): void => {
      let t = 0;
      for (let i = 0; i < 60 * seconds; i++) {
        g.update(1 / 60, t);
        t += 1 / 60;
      }
    };

    step(3);
    const before = worker.orderQueue[0]?.entityId ?? null;
    step(3);
    const after = worker.orderQueue[0]?.entityId ?? null;
    const busy = worker.isBusy();

    worker.ctx.findPath = oldFindPath;
    worker.ctx.findApproachPath = oldApproach;
    worker.ctx.isWalkable = oldWalkable;

    return { ok: true, before, after, firstId: first.id, secondId: second.id, busy };
  });

  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.before, 'the short 1.5 s grace must no longer drop the order').toBe(out.firstId);
  expect(out.busy, 'the gather order must still be running').toBe(true);
  expect(out.after, 'the worker should retarget a reachable node of the same resource').not.toBe(out.firstId);
});
