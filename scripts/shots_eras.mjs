import path from 'path';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

const { base, close } = await withViteServer();
const browser = await launchChromium();
const outDir = reviewDir();
for (const era of [0, 1, 2, 3, 4, 5]) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + `/?seed=777&fog=0&low=1&era=${era}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    const g = window.game;
    const c = [...g.buildings.values()].find((b) => b.kind === 'center' && b.owner === 0);
    if (c) {
      g.camera.moveTo(c.pos.x, c.pos.z, true);
      g.camera.setHeight(45);
    }
  });
  await page.waitForTimeout(2500);
  const fn = path.join(outDir, `era_${era}.png`);
  await page.screenshot({ path: fn });
  console.log('era_' + era, errors.length ? 'ERR:' + errors.slice(0, 2) : 'ok');
  await context.close();
}
console.log('done');
await browser.close();
await close();
