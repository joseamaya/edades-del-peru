import { test } from '@playwright/test';
test('scratch ai2', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as any).game !== undefined, null, { timeout: 30000 });
  const out = await page.evaluate(() => {
    const g = (window as any).game;
    g.loop.stop();
    g.paused = false;
    g.addAI(0);
    let t = 0;
    for (let i = 0; i < 60 * 300; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const rows: any[] = [];
    for (const w of g.units.values() as any) {
      if (w.owner !== 0 || w.kind !== 'worker') continue;
      const o = w.orderQueue[0];
      if (!o || o.kind !== 'gather') continue;
      const n = g.resourceNodes.get(o.entityId);
      if (!n) {
        rows.push({ res: '?', dist: -1 });
        continue;
      }
      const dist = Math.round(Math.hypot(w.pos.x - n.pos.x, w.pos.z - n.pos.z));
      const pathLen = g.pathfinder.pathfind(w.pos.x, w.pos.z, n.pos.x, n.pos.z).length;
      rows.push({ res: n.resource, dist, pathLen, nodeWalk: g.pathfinder.isWalkable(n.pos.x, n.pos.z) });
    }
    return { rows };
  });
  console.log('SCRATCH ' + JSON.stringify(out));
});
