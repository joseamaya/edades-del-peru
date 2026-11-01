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

test('three workers finish three gather cycles at a one-sided node', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead);
    const dropsite = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.isDropsite && !b.dead);
    if (workers.length < 3 || !dropsite) return { ok: false, reason: 'missing workers/dropsite' };

    const node = [...g.resourceNodes.values()]
      .filter((n: any) => !n.dead && !n.depleted && n.kind !== 'fishing' && n.amount > 200)
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.pos.x - dropsite.pos.x, a.pos.z - dropsite.pos.z) -
          Math.hypot(b.pos.x - dropsite.pos.x, b.pos.z - dropsite.pos.z),
      )[0];
    if (!node) return { ok: false, reason: 'no resource node' };

    // Ring the node but leave its north side open, so the only stand points are there.
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      if (Math.cos(angle) > -0.35 && Math.cos(angle) < 0.35) continue;
      g.pathfinder.addObstacle({
        x: node.pos.x + Math.cos(angle) * 2.6,
        z: node.pos.z + Math.sin(angle) * 2.6,
        radius: 1.5,
      });
    }

    const main = g.pathfinder.mainComponent();
    const north = g.pathfinder.nearestWalkablePoint(node.pos.x, node.pos.z - 3.5, 0, main);
    if (!north) return { ok: false, reason: 'no north stand point' };
    const crew = workers.slice(0, 3);
    for (const [i, w] of crew.entries()) {
      w.clearOrders();
      w.pos.set(north.x + (i - 1) * 0.8, 0, north.z + (i % 2) * 0.8);
      w.snapToGround();
      w.carryCapacity = 6;
      w.gatherMultiplier = 4;
    }

    const crewIds = new Set(crew.map((w: any) => w.id));
    const counts: Record<number, number> = {};
    for (const w of crew) counts[w.id] = 0;
    // UnitContext is shared by every unit, so only count the crew under test.
    const originalGather = crew[0].ctx.gather;
    crew[0].ctx.gather = (dropId: number, unitId: number, amount: number, resource: string) => {
      if (amount > 0 && crewIds.has(unitId)) counts[unitId] = (counts[unitId] ?? 0) + 1;
      return originalGather(dropId, unitId, amount, resource);
    };
    for (const w of crew) w.issueOrder({ kind: 'gather', entityId: node.id });

    let t = 0;
    let steps = 0;
    for (; steps < 60 * 180; steps++) {
      g.update(1 / 60, t);
      t += 1 / 60;
      if (crew.every((w: any) => (counts[w.id] ?? 0) >= 3)) break;
    }
    return {
      ok: true,
      counts: crew.map((w: any) => ({ id: w.id, count: counts[w.id] ?? 0 })),
      steps,
      busy: crew.map((w: any) => w.orderQueue[0]?.kind ?? null),
    };
  });

  expect(out.ok, out.reason ?? '').toBe(true);
  for (const entry of out.counts ?? []) expect(entry.count, `worker ${entry.id}`).toBeGreaterThanOrEqual(3);
});
