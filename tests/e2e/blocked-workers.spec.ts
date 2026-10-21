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
    return { ok: true, startOrders, endOrders: w.orderQueue.length, busy: w.isBusy() };
  });
  expect(out.ok, out.reason ?? '').toBe(true);
  expect(out.startOrders, 'the worker should have started with a gather order').toBeGreaterThan(0);
  expect(out.busy, 'the blocked worker should have yielded its order').toBe(false);
});
