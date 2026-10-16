import path from 'path';
import fs from 'fs';
import { launchChromium, withViteServer } from './lib.mjs';

const BASE = 'seed=777&fog=0&low=1';

function scene(name, { civ, period, view = 'close', map }) {
  const extra = map ? `&map=${map}` : '';
  return { name, url: `/?civ=${civ}&period=${period}&${BASE}${extra}`, view };
}

/**
 * Representative scenes for the visual review: the nine periods named in the PRP
 * and the remaining civilization families (architecture close-up of the player
 * base), plus four geographic regions (wide terrain view). The `civ`/`map` debug
 * params force the civilization/geography (see `main.ts`).
 */
export const SCENES = [
  // one close-up per PRP period (player base)
  scene('caral', { civ: 'caral', period: 0 }),
  scene('chavin', { civ: 'chavin', period: 1 }),
  scene('moche', { civ: 'moche', period: 2 }),
  scene('wari', { civ: 'wari', period: 3 }),
  scene('tiahuanaco', { civ: 'tiahuanaco', period: 3 }),
  scene('chimu', { civ: 'chimu', period: 4 }),
  scene('inca', { civ: 'inca', period: 5 }),
  scene('viceroyalty', { civ: 'realistas', period: 6 }),
  scene('republic', { civ: 'republica', period: 8 }),
  // the remaining civilization families (their own landmark/architecture identity)
  scene('cupisnique', { civ: 'cupisnique', period: 1 }),
  scene('paracas', { civ: 'paracas', period: 1 }),
  scene('nazca', { civ: 'nazca', period: 2 }),
  scene('chincha', { civ: 'chincha', period: 4 }),
  scene('chanca', { civ: 'chanca', period: 4 }),
  scene('collas_lupaca', { civ: 'collas_lupaca', period: 4 }),
  scene('huanca', { civ: 'huanca', period: 4 }),
  scene('patriotas', { civ: 'patriotas', period: 7 }),
  // four geographic regions (wide terrain view)
  scene('region_coast', { civ: 'caral', period: 0, view: 'wide' }),
  scene('region_andes', { civ: 'inca', period: 5, view: 'wide' }),
  scene('region_altiplano', { civ: 'tiahuanaco', period: 3, view: 'wide' }),
  scene('region_amazon', { civ: 'moche', period: 2, view: 'wide', map: 'jungle' }),
  // cultural landscape (coast slice: canals, fields, roads, plazas)
  scene('landscape_moche', { civ: 'moche', period: 2, view: 'wide' }),
  scene('landscape_caral', { civ: 'caral', period: 0, view: 'wide' }),
];

/** Capture every scene into `outDir` as `<name>.png`; returns capture results. */
export async function captureScenes(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const results = [];
  for (const scene of SCENES) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + scene.url, { waitUntil: 'networkidle' });
    const booted = await page
      .waitForFunction(() => window.game !== undefined, null, { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    let hasCenter = false;
    if (booted) {
      await page.waitForTimeout(2500);
      hasCenter = await page.evaluate((view) => {
        const g = window.game;
        const c = [...g.buildings.values()].find((b) => b.owner === 0 && b.kind === 'center');
        if (!c) return false;
        g.camera.moveTo(c.pos.x, c.pos.z, true);
        g.camera.setHeight(view === 'wide' ? 60 : 12);
        return true;
      }, scene.view);
      await page.waitForTimeout(1500);
    }
    const file = path.join(outDir, `${scene.name}.png`);
    await page.screenshot({ path: file });
    results.push({ name: scene.name, file, errors, ok: booted && hasCenter });
    await context.close();
  }
  await browser.close();
  await close();
  return results;
}
