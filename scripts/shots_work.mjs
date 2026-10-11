import path from 'path';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

const { base, close } = await withViteServer();
const browser = await launchChromium();
const outDir = reviewDir();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base + '/?seed=777&fog=0&low=1&play=1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(5000);

// order a worker to gather the nearest node and bring the camera closer
await page.evaluate(() => {
  const g = window.game;
  const w = [...g.units.values()].find((u) => u.kind === 'worker' && u.owner === 0);
  if (!w) return;
  let best = null;
  let bd = Infinity;
  for (const n of g.resourceNodes.values()) {
    const d = Math.hypot(n.pos.x - w.pos.x, n.pos.z - w.pos.z);
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  if (best) w.issueOrder({ kind: 'gather', entityId: best.id }, true);
  g.camera.moveTo(w.pos.x, w.pos.z, true);
  g.camera.setHeight(16);
});
await page.waitForTimeout(4000);
await page.screenshot({ path: path.join(outDir, 'work_gather.png') });
console.log('work_gather', errors.length ? 'ERR:' + errors.slice(0, 2) : 'ok');

// destination marker (circle + center dot) after a move order
await page.evaluate(() => {
  const g = window.game;
  const w = [...g.units.values()].find((u) => u.kind === 'worker' && u.owner === 0);
  const tx = w.pos.x + 4;
  const tz = w.pos.z + 3;
  g.markers.spawn(tx, g.terrain.getHeight(tx, tz), tz, 'move');
});
await page.waitForTimeout(180);
await page.screenshot({ path: path.join(outDir, 'order_move.png') });
console.log('order_move', errors.length ? 'ERR:' + errors.slice(0, 2) : 'ok');

await ctx.close();
console.log('done');
await browser.close();
await close();
