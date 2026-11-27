import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Capture the mission fires (ADR 0011) as a before/after pair: the same framing while the objective is
 * pending (no fire) and after it completes (fire and smoke). The objective is set through the mission's own
 * state so the fire follows the real code path; the chapter card it opens is dismissed so the fire tick keeps
 * running while the shots are taken.
 *
 * Usage: node scripts/capture_mission_fires.mjs [--mission=m_cusco_1536] [--height=45]
 *          [--out-dir=review]
 */
const mission = cliArg('mission', 'm_cusco_1536');
const height = Number.parseFloat(cliArg('height', '45'));
const outDir = path.resolve(cliArg('out-dir', reviewDir()));
fs.mkdirSync(outDir, { recursive: true });

const stem = mission.replace(/^m_/, '');
const beforePath = path.join(outDir, `fire-${stem}-before.png`);
const afterPath = path.join(outDir, `fire-${stem}-after.png`);

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto(`${base}/?mission=${mission}&intro=0&fog=0&seed=777`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
  await page
    .locator('.ed-primary', { hasText: 'COMENZAR' })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(4000);
  const staged = await page.evaluate((zoom) => {
    const g = window.game;
    const fires = g.mission.def.fires ?? [];
    const points = fires.map((f) => g.mission.resolvePoint(f.pos));
    const x = points.reduce((sum, p) => sum + p.x, 0) / Math.max(1, points.length);
    const z = points.reduce((sum, p) => sum + p.z, 0) / Math.max(1, points.length);
    document.querySelector('.ed-mission-card')?.remove();
    const ui = document.getElementById('ui-root');
    if (ui) ui.style.display = 'none';
    const labels = document.getElementById('ed-world-labels');
    if (labels) labels.style.display = 'none';
    const rings = g.scene.getObjectByName('mission-rings');
    if (rings) rings.visible = false;
    if (g.heroMarkers) g.heroMarkers.group.visible = false;
    g.camera.flyTo(x, z, zoom, 1.2, false);
    return { x, z, objectives: [...new Set(fires.map((f) => f.objectiveId))], count: points.length };
  }, height);
  if (!staged.count) throw new Error(`${mission} declares no fires`);
  // Mission camera beats (and the base reframe) can move the framing after the first flight: snap again
  // right before each shot so both halves of the pair are the same view.
  const frame = async () => {
    await page.evaluate(
      ([x, z, zoom]) => {
        const g = window.game;
        g.camera.follow(null);
        g.camera.moveTo(x, z, true);
        g.camera.setHeight(zoom);
      },
      [staged.x, staged.z, height],
    );
    await page.waitForTimeout(600);
  };
  await page.waitForTimeout(2500);
  await frame();
  await sharp(await page.screenshot({ type: 'png' }))
    .resize(960, 540)
    .png()
    .toFile(beforePath);
  await page.evaluate((ids) => {
    for (const id of ids) window.game.mission.objState.set(id, 'completed');
  }, staged.objectives);
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.ed-mission-card')?.remove());
  await page.waitForTimeout(3000);
  await frame();
  await sharp(await page.screenshot({ type: 'png' }))
    .resize(960, 540)
    .png()
    .toFile(afterPath);
  console.log(
    `captured ${path.relative(process.cwd(), beforePath)} and ${path.relative(process.cwd(), afterPath)} ` +
      `(${staged.count} fires around ${staged.x.toFixed(1)},${staged.z.toFixed(1)})`,
  );
  if (errors.length) console.log(errors.join('\n'));
} finally {
  await browser.close();
  await close();
}
