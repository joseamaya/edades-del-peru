import path from 'path';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

const { base, close } = await withViteServer();
const browser = await launchChromium();
const outDir = reviewDir();
for (const era of [0, 1, 2, 3, 4, 5]) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + `/?seed=777&fog=0&low=1&era=${era}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);
  // place several units and buildings to see them well
  await page.evaluate(() => {
    const g = window.game;
    const UnitCtor = Object.getPrototypeOf([...g.units.values()][0]).constructor;
    const c = [...g.buildings.values()].find((b) => b.kind === 'center' && b.owner === 0).pos;
    const kinds = ['worker', 'soldier', 'musketeer', 'hussar'];
    kinds.forEach((k, i) => {
      const u = new UnitCtor(k, 0, g.players[0].era, g.makeBuildContext(0));
      u.pos.set(c.x + 6 + i * 2.2, g.terrain.getHeight(c.x + 6 + i * 2.2, c.z + 4), c.z + 4);
      u.setContext(g.ctxFor());
      u.attach(g.scene);
      g.units.set(u.id, u);
    });
    g.camera.moveTo(c.x, c.z, true);
    g.camera.setHeight(26);
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, `close_${era}.png`) });
  console.log('close_' + era);
  await ctx.close();
}
console.log('done');
await browser.close();
await close();
