import path from 'path';
import fs from 'fs';
import { launchChromium, withViteServer, reviewDir, cliArg } from './lib.mjs';

/**
 * Comparable before/after captures for the Tambotoco art pass (Plan Fase 6).
 * Usage: node scripts/capture_ayllu_quality.mjs [--tag=before|after]
 *        [--sizes=1280x720,1600x900,1920x1080] [--views=cave,shrine,hualla,acequia,inticancha,valley,close,wide]
 *
 * Every view is captured with HUD hidden, fixed seed 777, the site at `fundada` and the acequia open,
 * so the only difference between two runs is the code. Writes
 * review/ayllu-quality-<tag>-<width>x<height>-<view>.png and a summary JSON.
 */
const tag = cliArg('tag', 'after');
const sizes = cliArg('sizes', '1280x720,1600x900,1920x1080')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    if (!w || !h) throw new Error(`invalid size ${s}`);
    return { width: w, height: h, label: `${w}x${h}` };
  });
const ALL_VIEWS = {
  cave: { x: 40, z: 55, h: 24, title: 'Cueva de Tambotoco' },
  shrine: { x: 120, z: 106, h: 40, title: 'Huanacaure' },
  hualla: { x: 136, z: 166, h: 24, title: 'Aldea hualla' },
  acequia: { x: 166, z: 178, h: 30, title: 'Acequia de los alcabizas' },
  inticancha: { x: 168, z: 190, h: 34, title: 'Inticancha fundada' },
  built: { x: 168, z: 190, h: 44, title: 'Inticancha con la base Killke' },
  valley: { x: 160, z: 155, h: 58, title: 'Valle del Cusco' },
  close: { x: 138, z: 163, h: 13, title: 'Detalle de aldea' },
  wide: { x: 168, z: 190, h: 90, title: 'Lectura estratégica' },
};
const wanted = cliArg('views', Object.keys(ALL_VIEWS).join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
for (const name of wanted) if (!ALL_VIEWS[name]) throw new Error(`unknown view ${name}`);
const views = wanted.map((name) => ({ name, ...ALL_VIEWS[name] }));

async function main() {
  const out = reviewDir();
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const files = [];
  const errors = [];
  try {
    for (const size of sizes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(`${size.label}: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`${size.label}: ${m.text()}`);
      });
      await page.goto(base + '/?mission=m_tambotoco&seed=777&fog=0&low=1&intro=0', {
        waitUntil: 'networkidle',
      });
      await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 30_000 });
      await page
        .locator('.ed-primary')
        .first()
        .click({ timeout: 3000 })
        .catch(() => {});
      await page.waitForTimeout(2200);
      await page.addStyleTag({ content: '#ui-root { display: none !important; }' });
      const spawnBuilt = views.some((v) => v.name === 'built');
      await page.evaluate(
        ({ spawnBuilt }) => {
          const g = window.game;
          g.setSitePhase('fundada');
          if (spawnBuilt) {
            g.spawnScriptedBuilding('mill', 0, 168, 190);
            for (const [x, z] of [
              [156, 190],
              [180, 190],
              [168, 178],
              [168, 202],
            ]) {
              g.spawnScriptedBuilding('house', 0, x, z);
            }
          }
          // Evidence bypass: the capture shows the hydraulic system in its open, irrigated state.
          g.canalOpen = true;
          g.updateCanalVisual();
          g.refreshFarmYields?.();
        },
        { spawnBuilt },
      );
      await page.waitForTimeout(1500);
      for (const view of views) {
        await page.evaluate(({ x, z, h }) => {
          const g = window.game;
          g.camera.follow(null);
          g.camera.moveTo(x, z, true);
          g.camera.setHeight(h);
        }, view);
        await page.waitForTimeout(1600);
        const file = path.join(out, `ayllu-quality-${tag}-${size.label}-${view.name}.png`);
        await page.screenshot({ path: file });
        files.push(file);
        console.log(file);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await close();
  }
  const summary = path.join(out, `ayllu-quality-${tag}.json`);
  fs.writeFileSync(summary, JSON.stringify({ tag, sizes, views: views.map((v) => v.name), files, errors }, null, 2));
  if (errors.length) console.log('page errors:', errors.slice(0, 8));
  console.log(summary);
}

await main();
