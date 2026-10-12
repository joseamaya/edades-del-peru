import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

/**
 * Reproducible performance benchmark for entity scale.
 *
 * Usage: node scripts/bench.mjs [--units=100,300,500,1000] [--seed=777] [--render-ms=3000]
 *
 * For each scale it boots a match, spawns N soldiers, measures:
 *   spawn/destroy time, simulation step time, pathfinding, target acquisition,
 *   then FPS and draw calls with the render loop running.
 * Writes review/bench.json (gitignored) and prints a table. Numbers are only
 * comparable on the same machine/browser; treat them as relative signals.
 */

const arg = (name, fallback) => {
  const a = process.argv.find((v) => v.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : fallback;
};

const scales = String(arg('units', '100,300,500'))
  .split(',')
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n) && n > 0);
const seed = Number.parseInt(arg('seed', '777'), 10);
const renderMs = Number.parseInt(arg('render-ms', '3000'), 10);

async function measure(browser, base, n) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${base}/?play=1&seed=${seed}&low=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const sim = await page.evaluate((N) => {
    const g = window.game;
    g.loop.stop();
    g.paused = false;
    const size = g.settings.mapSize;
    const center = g.camera.getTarget();
    // deterministic sampling of path/target points (reproducible averages)
    let seedR = 0x2f6e2b1;
    const rnd = () => {
      seedR = (seedR * 1103515245 + 12345) & 0x7fffffff;
      return seedR / 0x7fffffff;
    };

    const cols = Math.ceil(Math.sqrt(N));
    const spacing = Math.max(3, Math.min(8, 120 / cols));
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      const x = center.x + ((i % cols) - cols / 2) * spacing;
      const z = center.z + (Math.floor(i / cols) - cols / 2) * spacing;
      g.spawnScriptedUnit('soldier', 0, x, z);
    }
    const spawnMs = performance.now() - t0;
    if (g.rebuildSpatial) g.rebuildSpatial();

    let t = performance.now();
    const pathCalls = 60;
    let pathLen = 0;
    for (let i = 0; i < pathCalls; i++) {
      pathLen += g.pathfinder.pathfind(rnd() * size, rnd() * size, rnd() * size, rnd() * size).length;
    }
    const pathMs = performance.now() - t;

    t = performance.now();
    const targetCalls = 400;
    let found = 0;
    for (let i = 0; i < targetCalls; i++) {
      found += g.enemiesNear(rnd() * size, rnd() * size, 15, 0).length;
    }
    const targetMs = performance.now() - t;

    t = performance.now();
    const steps = 120;
    let tt = 0;
    for (let i = 0; i < steps; i++) {
      tt += 1 / 60;
      g.update(1 / 60, tt);
    }
    const simMs = performance.now() - t;

    const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    return { spawnMs, pathMs, pathCalls, pathLen, targetMs, targetCalls, found, simMs, steps, units: g.units.size, memory };
  }, n);

  // render: zoom out so most units are in view, then let the loop run.
  // `__directRender` bypasses post-processing so renderer.info counts the real scene passes.
  await page.evaluate(() => {
    const g = window.game;
    g.camera.setHeight(500);
    window.__directRender = true;
    g.loop.start();
  });
  await page.waitForTimeout(renderMs);
  const render = await page.evaluate(() => {
    const g = window.game;
    const info = g.renderer.info;
    return {
      fps: g.loop.getFps(),
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  });

  const destroyMs = await page.evaluate(() => {
    const g = window.game;
    g.loop.stop();
    const ids = [...g.units.keys()];
    const t = performance.now();
    for (const id of ids) {
      const u = g.units.get(id);
      if (u && u.removeFromScene) u.removeFromScene();
      g.units.delete(id);
    }
    return performance.now() - t;
  });

  await context.close();
  return { n, ...sim, ...render, destroyMs, errors };
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const rows = [];
  for (const n of scales) {
    process.stdout.write(`bench: ${n} units... `);
    const r = await measure(browser, base, n);
    rows.push(r);
    console.log(`done (${r.simMs.toFixed(1)}ms sim / ${r.fps} fps)`);
  }
  await browser.close();
  await close();

  const out = { env: { seed, viewport: '1280x800', renderMs }, rows, date: new Date().toISOString() };
  fs.writeFileSync(path.join(reviewDir(), 'bench.json'), JSON.stringify(out, null, 2));

  console.log('\nunits | spawnMs | destroyMs | simMs/step | pathMs/call | targetUs/call | fps | drawCalls | tris | mem MB');
  for (const r of rows) {
    console.log(
      [
        r.n,
        r.spawnMs.toFixed(0),
        r.destroyMs.toFixed(0),
        (r.simMs / r.steps).toFixed(2),
        (r.pathMs / r.pathCalls).toFixed(2),
        ((r.targetMs / r.targetCalls) * 1000).toFixed(1),
        r.fps,
        r.drawCalls,
        r.triangles,
        r.memory ?? '-',
      ].join(' | '),
    );
  }
  const errs = rows.flatMap((r) => r.errors);
  if (errs.length) console.log('\npage errors:', errs);
  console.log('\nwrote review/bench.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
