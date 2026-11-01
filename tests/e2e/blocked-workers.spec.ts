import { test, expect } from '@playwright/test';

/**
 * A worker that cannot make progress toward its gather target must yield the order
 * (so the AI can reassign it) instead of re-pathing forever. Regression guard for
 * the "blocked worker" economy stall (see docs/development/performance-audit.md,
 * seed 783): workers stayed busy with an active path that never advanced.
 *
 * An immobile worker (speed 0) with a live, non-empty path reproduces the stall
 * deterministically: it keeps a route but cannot advance, which is the case the
 * stuck-retry give-up targets.
 */
test('a blocked worker yields its gather order instead of re-pathing forever', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const w = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead);
    if (!w) return { ok: false, reason: 'no worker' };
    const node = [...g.resourceNodes.values()].find((n: any) => !n.dead && !n.depleted);
    if (!node) return { ok: false, reason: 'no node' };

    w.issueOrder({ kind: 'gather', entityId: node.id });
    // keep a live path the worker cannot follow (it is immobile)
    w.path = [
      { x: w.pos.x + 8, z: w.pos.z },
      { x: w.pos.x + 16, z: w.pos.z },
    ];
    w.pathIdx = 0;
    w.stats = { ...w.stats, speed: 0 };

    const startOrders = w.orderQueue.length;
    let t = 0;
    for (let i = 0; i < 60 * 12; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return { ok: true, startOrders, endOrders: w.orderQueue.length, busy: w.isBusy(), pathLen: w.path.length };
  });
  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.startOrders, 'the worker should have started with a gather order').toBeGreaterThan(0);
  expect(out.busy, 'the blocked worker should have yielded its order').toBe(false);
  expect(out.pathLen, 'the yielded worker should not keep a stale path').toBe(0);
});

test('a blocked worker emits one actionable HUD alert', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const w = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead);
    const node = [...g.resourceNodes.values()].find((n: any) => !n.dead && !n.depleted);
    if (!w || !node) return { ok: false, reason: 'missing worker/node' };

    w.issueOrder({ kind: 'gather', entityId: node.id });
    w.path = [
      { x: w.pos.x + 8, z: w.pos.z },
      { x: w.pos.x + 16, z: w.pos.z },
    ];
    w.pathIdx = 0;
    w.stats = { ...w.stats, speed: 0 };

    let t = 0;
    for (let i = 0; i < 60 * 7; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const alerts = document.querySelectorAll<HTMLElement>('.ed-alert');
    const alert = alerts[0] ?? null;
    const text = alert?.textContent ?? '';
    const before = [...g.selectedUnits];
    alert?.click();
    return {
      ok: true,
      count: alerts.length,
      text,
      before,
      selected: [...g.selectedUnits],
      workerId: w.id,
      workerPos: { x: w.pos.x, z: w.pos.z },
      target: g.camera.getTarget(),
    };
  });

  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.count).toBe(1);
  expect(out.text).toContain(`Trabajador ${out.workerId}`);
  expect(out.text).toContain('no puede avanzar');
  expect(out.before).not.toContain(out.workerId);
  expect(out.selected).toContain(out.workerId);
  expect(out.target.x).toBeCloseTo(out.workerPos.x, 0);
  expect(out.target.z).toBeCloseTo(out.workerPos.z, 0);
});

test('an unreachable gather target reports its reason', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const w = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead);
    const node = [...g.resourceNodes.values()].find((n: any) => !n.dead && !n.depleted);
    if (!w || !node) return { ok: false, reason: 'missing worker/node' };
    // Move away from the node so this is a real long-range gather order, then
    // make the route search and direct approach fail while keeping the target valid.
    w.pos.set(4, g.terrain.getHeight(4, 4), 4);
    w.snapToGround();
    const oldFindPath = w.ctx.findPath;
    const oldApproach = w.ctx.findApproachPath;
    const oldWalkable = w.ctx.isWalkable;
    w.ctx.findPath = () => [];
    w.ctx.findApproachPath = () => [];
    // Keep the unit's current cell walkable so it cannot use the controlled
    // blocked-cell escape; every step ahead is blocked.
    w.ctx.isWalkable = (x: number, z: number) => x === w.pos.x && z === w.pos.z;
    w.issueOrder({ kind: 'gather', entityId: node.id });
    let t = 0;
    // Gather orders now get the longer NO_ROUTE_GIVEUP_ECONOMY grace (4.5 s).
    for (let i = 0; i < 60 * 6; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    w.ctx.findPath = oldFindPath;
    w.ctx.findApproachPath = oldApproach;
    w.ctx.isWalkable = oldWalkable;
    return {
      ok: true,
      text: document.querySelector<HTMLElement>('.ed-alert')?.textContent ?? '',
      workerId: w.id,
      busy: w.isBusy(),
    };
  });

  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.text).toContain(`Trabajador ${out.workerId}`);
  expect(out.text).toContain('sin ruta al recurso');
  expect(out.busy, 'the blocked order should be dropped').toBe(false);
});
