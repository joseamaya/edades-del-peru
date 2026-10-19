import path from 'path';
import fs from 'fs';
import { launchChromium, withViteServer } from './lib.mjs';

/**
 * Curated media captures for the README / itch.io: the full cinematic look (not
 * `?low=1`), written as small JPEGs into `docs/media/`. Run with `yarn shots:media`.
 */
const OUT = path.resolve('docs/media');
const SCENES = [
  { name: 'hero', url: '/?civ=moche&period=2&seed=777&fog=0', view: 'close' },
  { name: 'chavin', url: '/?mission=m2_chavin&seed=900&fog=0', view: 'close' },
];

const { base, close } = await withViteServer();
const browser = await launchChromium();
fs.mkdirSync(OUT, { recursive: true });
let failed = 0;
for (const scene of SCENES) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + scene.url, { waitUntil: 'networkidle' });
  const booted = await page
    .waitForFunction(() => window.game !== undefined, null, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!booted) {
    console.log(`${scene.name} FAIL (no boot)`);
    failed++;
    await context.close();
    continue;
  }
  await page.waitForTimeout(4500);
  // dismiss the mission briefing / any start overlay so the world is visible
  await page
    .evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /COMENZAR MISIÓN|Comenzar|Empezar/i.test(b.textContent ?? ''),
      );
      if (btn) btn.click();
    })
    .catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(
    ({ view }) => {
      const g = window.game;
      const c = [...g.buildings.values()].find((b) => b.owner === 0 && b.kind === 'center');
      if (c) g.camera.moveTo(c.pos.x, c.pos.z, true);
      g.camera.setHeight(view === 'close' ? 11 : 48);
    },
    { view: scene.view },
  );
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUT, `${scene.name}.jpg`), type: 'jpeg', quality: 82 });
  console.log(`${scene.name} ${errors.length ? 'ERR:' + errors.slice(0, 2) : 'ok'}`);
  failed += errors.length ? 1 : 0;
  await context.close();
}
await browser.close();
await close();
console.log(`done${failed ? ` (${failed} issue(s))` : ''}`);
process.exit(failed ? 1 : 0);
