import path from 'path';
import fs from 'fs';
import { launchChromium, withViteServer } from './lib.mjs';

/**
 * Representative scenes for the visual review: one per historical period
 * (architecture close-up) and one per geographic region (wide terrain view).
 * The `civ`/`map` debug params force the civilization/geography (see `main.ts`).
 */
export const SCENES = [
  { name: 'caral', url: '/?civ=caral&period=0&seed=777&fog=0&low=1', view: 'close' },
  { name: 'chavin', url: '/?civ=chavin&period=1&seed=777&fog=0&low=1', view: 'close' },
  { name: 'moche', url: '/?civ=moche&period=2&seed=777&fog=0&low=1', view: 'close' },
  { name: 'wari', url: '/?civ=wari&period=3&seed=777&fog=0&low=1', view: 'close' },
  { name: 'tiahuanaco', url: '/?civ=tiahuanaco&period=3&seed=777&fog=0&low=1', view: 'close' },
  { name: 'chimu', url: '/?civ=chimu&period=4&seed=777&fog=0&low=1', view: 'close' },
  { name: 'inca', url: '/?civ=inca&period=5&seed=777&fog=0&low=1', view: 'close' },
  { name: 'viceroyalty', url: '/?civ=realistas&period=6&seed=777&fog=0&low=1', view: 'close' },
  { name: 'republic', url: '/?civ=republica&period=8&seed=777&fog=0&low=1', view: 'close' },
  { name: 'region_coast', url: '/?civ=caral&period=0&seed=777&fog=0&low=1', view: 'wide' },
  { name: 'region_andes', url: '/?civ=inca&period=5&seed=777&fog=0&low=1', view: 'wide' },
  { name: 'region_altiplano', url: '/?civ=tiahuanaco&period=3&seed=777&fog=0&low=1', view: 'wide' },
  { name: 'region_amazon', url: '/?civ=moche&map=jungle&period=2&seed=777&fog=0&low=1', view: 'wide' },
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
    await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.evaluate((view) => {
      const g = window.game;
      const c = [...g.buildings.values()].find((b) => b.owner === 0 && b.kind === 'center');
      if (c) {
        g.camera.moveTo(c.pos.x, c.pos.z, true);
        g.camera.setHeight(view === 'wide' ? 60 : 12);
      }
    }, scene.view);
    await page.waitForTimeout(1500);
    const file = path.join(outDir, `${scene.name}.png`);
    await page.screenshot({ path: file });
    results.push({ name: scene.name, file, errors });
    await context.close();
  }
  await browser.close();
  await close();
  return results;
}
