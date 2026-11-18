import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { cliArg, launchChromium, withViteServer } from './lib.mjs';

/**
 * Capture the E5 foundation beat (docs/design/tambotoco-art-pilot.md) from the game itself: the Act IV
 * `inticancha` site, a scripted communal store and Ayar Auca's stone under the same zoom-29 camera cue the
 * mission fires when `a4_inticancha` completes. The staging is the debug harness's, as in the intro
 * captures; the shot itself is the authored one.
 *
 * Usage: node scripts/capture_tambotoco_foundation.mjs [--out=docs/media/tambotoco-e5-fundacion.webp]
 */
const OUT = path.resolve(cliArg('out', 'docs/media/tambotoco-e5-fundacion.webp'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await page.goto(`${base}/?mission=m_tambotoco&intro=0&fog=0&seed=777`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
  await page
    .locator('.ed-primary', { hasText: 'COMENZAR' })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(4500);
  await page.evaluate(() => {
    const g = window.game;
    document.querySelector('.ed-mission-card')?.remove();
    const ui = document.getElementById('ui-root');
    if (ui) ui.style.display = 'none';
    const labels = document.getElementById('ed-world-labels');
    if (labels) labels.style.display = 'none';
    const rings = g.scene.getObjectByName('mission-rings');
    if (rings) rings.visible = false;
    if (g.heroMarkers) g.heroMarkers.group.visible = false;
    g.setSitePhase('inticancha');
    g.spawnScriptedBuilding('mill', 0, 176, 192);
    // The stone's raise already fires the ritual dust; do not queue a second burst.
    g.raiseMemoryStone('ayar_auca', 174, 196, 'Piedra de Ayar Auca');
    // The authored t_inticancha cue: the plaza at zoom 29, with the Act IV reveal.
    g.mission.applyEffect({
      type: 'camera',
      pos: { dx: 171, dz: 193 },
      zoom: 29,
      seconds: 2.2,
      reveal: 45,
    });
  });
  await page.waitForTimeout(4500);
  const png = await page.screenshot({ type: 'png' });
  await sharp(png).resize(960, 540).webp({ quality: 60 }).toFile(OUT);
  console.log(`captured ${path.relative(process.cwd(), OUT)} (${fs.statSync(OUT).size} bytes)`);
} finally {
  await browser.close();
  await close();
}
