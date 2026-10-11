import path from 'path';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

const { base, close } = await withViteServer();
const browser = await launchChromium();
const outDir = reviewDir();
for (const era of [0, 5]) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await ctx.newPage();
  await page.goto(base + `/?seed=777&fog=0&low=1&era=${era}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const g = window.game;
    const b = [...g.buildings.values()].find((x) => x.kind === 'centro' && x.owner === 0);
    g.camera.moveTo(b.pos.x, b.pos.z, true);
    g.camera.setHeight(9);
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, `bld_${era}.png`) });
  console.log('bld_' + era);
  await ctx.close();
}
console.log('done');
await browser.close();
await close();
