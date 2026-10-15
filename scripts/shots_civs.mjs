import path from 'path';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

const MISSIONS = [
  ['caral', 'm1_caral'],
  ['moche', 'm3_moche_recuay'],
  ['inca', 'm5_yahuar_pampa'],
  ['virreinato', 'm7_tupac_amaru'],
  ['republica', 'm8_independencia'],
];

const { base, close } = await withViteServer();
const browser = await launchChromium();
const outDir = reviewDir();
for (const [name, mission] of MISSIONS) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + `/?mission=${mission}&fog=0&low=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const g = window.game;
    const c = [...g.buildings.values()].find((b) => b.owner === 0 && b.kind === 'center');
    if (c) {
      g.camera.moveTo(c.pos.x, c.pos.z, true);
      g.camera.setHeight(14);
    }
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, `civ_${name}.png`) });
  console.log(`civ_${name}`, errors.length ? 'ERR:' + errors.slice(0, 2) : 'ok');
  await context.close();
}
console.log('done');
await browser.close();
await close();
