import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, reviewDir, cliArg } from './lib.mjs';

/**
 * Capture the art-direction reference views (docs/design/art-direction.md §3: close 28, default 54,
 * wide = max zoom) from a mission's opening camera at 1600x900, and log draw calls and triangles.
 *
 * Usage: node scripts/shots_reference_views.mjs [--mission=m1_caral] [--name=ref] [--wait=9000]
 *          [--low=1] [--wide=120] [--focus=tree]
 *
 * `--focus=site` centres the camera on the mission site (the Caral city), `--at=x,z` on a map point;
 * `--focus=tree` centres the camera on the densest tree cluster near the opening view instead
 * (`--focus=deer` / `--focus=riparian_bird` on the first animal of that species);
 * `--kitlod0=1` keeps vegetation-kit LOD0 near the camera even on a software renderer (headless
 * Chromium), which otherwise falls back to LOD1 everywhere.
 */
const mission = cliArg('mission') ?? 'm1_caral';
const name = cliArg('name') ?? `ref_${mission}`;
const wait = Number(cliArg('wait') ?? 9000);
const low = cliArg('low') === '1';
const wide = Number(cliArg('wide') ?? 120);
const focus = cliArg('focus');
const at = cliArg('at')?.split(',').map(Number);
const kitLod0 = cliArg('kitlod0') === '1';
const views = { close: 28, default: 54, wide };

const outDir = path.join(reviewDir(), 'reference-views');
fs.mkdirSync(outDir, { recursive: true });

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
  });
  const url = `${base}/?mission=${mission}&intro=0&fog=0&seed=777${low ? '&low=1' : ''}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60000 });
  // These views render outside the loop: refresh the shadow map on every render.
  await page.evaluate(() => {
    window.game.renderer.shadowMap.autoUpdate = true;
  });
  await page.waitForTimeout(wait);
  await page
    .locator('.ed-primary', { hasText: 'COMENZAR' })
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const root = document.getElementById('ui-root');
    if (root) root.style.display = 'none';
  });
  if (kitLod0) await page.evaluate(() => (window.game.trees.kitLod0Radius = 45));
  if (focus === 'deer' || focus === 'riparian_bird') {
    await page.evaluate((species) => {
      const g = window.game;
      const a = g.wildlife.debugSnapshot().find((e) => e.species === species);
      if (a) g.camera.moveTo(a.x, a.z, true);
    }, focus);
  }
  if (at) {
    await page.evaluate(([x, z]) => window.game.camera.moveTo(x, z, true), at);
  }
  if (focus === 'site') {
    await page.evaluate(() => {
      const g = window.game;
      const f = g.siteFocus ?? g.siteAnchor;
      if (f) g.camera.moveTo(f.x, f.z, true);
    });
  }
  if (focus === 'tree') {
    await page.evaluate(() => {
      const g = window.game;
      const start = g.camera.getTarget();
      const trees = [...g.resourceNodes.values()].filter((n) => n.kind === 'tree');
      let best = null;
      let bestScore = -Infinity;
      for (const t of trees) {
        const near = trees.filter((o) => Math.hypot(o.pos.x - t.pos.x, o.pos.z - t.pos.z) < 10).length;
        const score = near * 4 - Math.hypot(t.pos.x - start.x, t.pos.z - start.z) * 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = t;
        }
      }
      if (best) g.camera.moveTo(best.pos.x, best.pos.z, true);
    });
  }
  const report = {};
  for (const [view, zoom] of Object.entries(views)) {
    await page.evaluate((z) => window.game.camera.setHeight(z), zoom);
    await page.waitForTimeout(2500);
    const file = path.join(outDir, `${name}_${view}.png`);
    await page.screenshot({ path: file });
    // One plain scene render (shadow pass included, post-processing excluded) for the counters.
    report[view] = await page.evaluate(() => {
      const g = window.game;
      const info = g.renderer.info;
      info.autoReset = false;
      info.reset();
      g.renderer.render(g.scene, g.camera.camera);
      const out = { calls: info.render.calls, triangles: info.render.triangles };
      info.autoReset = true;
      return out;
    });
    console.log(`${view}: zoom ${zoom} ${JSON.stringify(report[view])} -> ${file}`);
  }
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ url, report, errors }, null, 2) + '\n');
  if (errors.length) console.log('errors:', errors.slice(0, 5));
} finally {
  await browser.close();
  await close();
}
