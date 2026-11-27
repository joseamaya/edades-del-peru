import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Capture the Caral dwellings before and after the late-phase switch (issue #436): the same framing with the
 * quincha houses of act III (`in_use`) and the granodiorite houses of the act IV drought (`late`). The phase is
 * set through `game.setSitePhase`, the same path the mission trigger uses, so the architecture kit bakes the
 * real replacements instead of a staged prop.
 *
 * Usage: node scripts/capture_caral_late_houses.mjs [--zoom=70] [--out=review/caral-late-houses]
 *   --out is a path prefix; the pair is written as `<out>-quincha.webp` and `<out>-stone.webp`, so
 *   `--out=docs/media/caral-late-houses` regenerates the pair the PR ships.
 */
const zoom = Number.parseFloat(cliArg('zoom', '70'));
const out = path.resolve(cliArg('out', path.join(reviewDir(), 'caral-late-houses')));
fs.mkdirSync(path.dirname(out), { recursive: true });

const beforePath = `${out}-quincha.webp`;
const afterPath = `${out}-stone.webp`;

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto(`${base}/?mission=m1_caral&intro=0&fog=0&seed=777`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
  await page
    .locator('.ed-primary', { hasText: 'COMENZAR' })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(4000);

  const view = await page.evaluate(async () => {
    const g = window.game;
    const { CARAL_CITY_LAYOUT } = await import('/src/model/defs/caralCity.ts');
    const houses = CARAL_CITY_LAYOUT.filter((p) => p.asset === 'house_common' || p.asset === 'house_elite');
    const x = houses.reduce((sum, p) => sum + p.x, 0) / houses.length;
    const z = houses.reduce((sum, p) => sum + p.z, 0) / houses.length;
    document.querySelector('.ed-mission-card')?.remove();
    const ui = document.getElementById('ui-root');
    if (ui) ui.style.display = 'none';
    const labels = document.getElementById('ed-world-labels');
    if (labels) labels.style.display = 'none';
    const rings = g.scene.getObjectByName('mission-rings');
    if (rings) rings.visible = false;
    if (g.heroMarkers) g.heroMarkers.group.visible = false;
    return { x, z, houses: houses.length };
  });
  if (!view.houses) throw new Error('m1_caral declares no house placements');

  const frame = async () => {
    await page.evaluate(
      ([x, z, height]) => {
        const g = window.game;
        g.camera.follow(null);
        g.camera.moveTo(x, z, true);
        g.camera.setHeight(height);
      },
      [view.x, view.z, zoom],
    );
    await page.waitForTimeout(700);
  };

  const shot = async (phase, file) => {
    await page.evaluate((p) => window.game.setSitePhase(p), phase);
    await page.waitForTimeout(1200);
    await frame();
    await sharp(await page.screenshot({ type: 'png' }))
      .resize(960, 540)
      .webp({ quality: 72 })
      .toFile(file);
    console.log(`captured ${path.relative(process.cwd(), file)} (${phase})`);
  };

  await shot('in_use', beforePath);
  await shot('late', afterPath);
  console.log(`${view.houses} houses around ${view.x.toFixed(1)},${view.z.toFixed(1)} at zoom ${zoom}`);
  if (errors.length) console.log(errors.join('\n'));
} finally {
  await browser.close();
  await close();
}
