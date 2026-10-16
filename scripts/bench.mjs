import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, reviewDir, cliArg } from './lib.mjs';

/**
 * Reproducible performance benchmark for entity scale.
 *
 * Usage: node scripts/bench.mjs [--units=100,300,500,1000] [--seed=777]
 *
 * For each scale it boots a match, spawns N soldiers, measures:
 *   spawn/destroy time, simulation step time, A* per call, target acquisition,
 *   hover-picking cost, then (with the loop running) FPS, frame time, long tasks
 *   and real scene draw calls/triangles (`window.__directRender` bypasses
 *   post-processing so `renderer.info` is meaningful).
 * Writes review/bench.json (gitignored) and prints a table. Numbers are only
 * comparable on the same machine/browser; treat them as relative signals.
 */

const scales = String(cliArg('units', '100,300,500,1000'))
  .split(',')
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n) && n > 0);
const seed = Number.parseInt(cliArg('seed', '777'), 10);

// The cultural landscape must stay a handful of draw calls: the layer merges each
// feature into one mesh. Budget from docs/design/cultural-landscape.md.
const LANDSCAPE_DRAW_CALL_BUDGET = 150;

async function measure(browser, base, n) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${base}/?play=1&seed=${seed}&low=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
  await page.waitForTimeout(1500);

  const sim = await page.evaluate((N) => {
    const g = window.game;
    g.loop.stop();
    g.paused = false;
    const size = g.settings.mapSize;
    const center = g.camera.getTarget();
    // deterministic sampling, different per scale (pathfinding is scale-independent)
    let seedR = (0x2f6e2b1 ^ N) >>> 0;
    const rnd = () => {
      seedR = (seedR * 1103515245 + 12345) & 0x7fffffff;
      return seedR / 0x7fffffff;
    };

    const cols = Math.ceil(Math.sqrt(N));
    const spacing = Math.max(3, Math.min(8, 120 / cols));
    let t = performance.now();
    for (let i = 0; i < N; i++) {
      const x = center.x + ((i % cols) - cols / 2) * spacing;
      const z = center.z + (Math.floor(i / cols) - cols / 2) * spacing;
      g.spawnScriptedUnit('soldier', 0, x, z);
    }
    const spawnMs = performance.now() - t;

    t = performance.now();
    const pathCalls = 60;
    for (let i = 0; i < pathCalls; i++) {
      g.pathfinder.pathfind(rnd() * size, rnd() * size, rnd() * size, rnd() * size);
    }
    const pathMs = performance.now() - t;

    const memBefore = performance.memory ? performance.memory.usedJSHeapSize : null;
    t = performance.now();
    const steps = 120;
    let clock = 0;
    for (let i = 0; i < steps; i++) {
      clock += 1 / 60;
      g.update(1 / 60, clock);
    }
    const simMs = performance.now() - t;
    const memAfter = performance.memory ? performance.memory.usedJSHeapSize : null;
    const heapDeltaMB = memBefore != null && memAfter != null ? (memAfter - memBefore) / 1048576 : null;

    // spatial hash is refreshed by the sim loop, then target acquisition
    t = performance.now();
    const targetCalls = 400;
    for (let i = 0; i < targetCalls; i++) g.enemiesNear(rnd() * size, rnd() * size, 15, 0);
    const targetMs = performance.now() - t;

    // hover picking is the O(N) path run on every mousemove
    t = performance.now();
    const pickCalls = 50;
    for (let i = 0; i < pickCalls; i++) g.pickAt(200 + (i % 800), 150 + (i % 500));
    const pickMs = performance.now() - t;

    const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    return {
      spawnMs,
      pathMs,
      pathCalls,
      targetMs,
      targetCalls,
      pickMs,
      pickCalls,
      simMs,
      steps,
      heapDeltaMB,
      units: g.units.size,
      memory,
    };
  }, n);

  // render: zoom out to the max so most units are in view, then sample frame time
  await page.evaluate(() => {
    const g = window.game;
    g.camera.setHeight(1e9);
    window.__directRender = true;
    g.loop.start();
  });
  await page.waitForTimeout(500);
  const frame = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const longTasks = [];
        try {
          const po = new PerformanceObserver((l) => {
            for (const e of l.getEntries()) longTasks.push(e.duration);
          });
          po.observe({ type: 'longtask' });
        } catch {
          /* longtask unsupported */
        }
        const times = [];
        let last = performance.now();
        const end = last + 1500;
        const step = () => {
          const now = performance.now();
          times.push(now - last);
          last = now;
          if (now >= end) {
            times.sort((a, b) => a - b);
            resolve({
              frameMsAvg: times.reduce((s, x) => s + x, 0) / times.length,
              frameMsP95: times[Math.min(times.length - 1, Math.floor(times.length * 0.95))],
              longTasks: longTasks.length,
              longTaskMs: longTasks.reduce((s, x) => s + x, 0),
            });
          } else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );
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

  // isolate the cultural landscape's draw calls: render once with the layer
  // visible and once hidden, at max zoom so every mesh is in view
  const landscape = await page.evaluate(() => {
    const g = window.game;
    const group = g.landscape && g.landscape.group;
    g.loop.stop();
    window.__directRender = true;
    g.camera.setHeight(1e9);
    const sample = () => {
      g.renderer.render(g.scene, g.camera.camera);
      return { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
    };
    const shown = sample();
    if (group) group.visible = false;
    const hidden = sample();
    if (group) group.visible = true;
    return {
      landscapeCalls: shown.calls - hidden.calls,
      landscapeTris: shown.tris - hidden.tris,
      sceneCalls: shown.calls,
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
  return { n, ...sim, ...frame, ...render, ...landscape, destroyMs, errors };
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const rows = [];
  for (const n of scales) {
    process.stdout.write(`bench: ${n} units... `);
    const r = await measure(browser, base, n);
    rows.push(r);
    console.log(`done (${r.simMs.toFixed(1)}ms sim / ${r.drawCalls} draws)`);
  }
  await browser.close();
  await close();

  const out = { env: { seed, viewport: '1280x800' }, rows, date: new Date().toISOString() };
  fs.writeFileSync(path.join(reviewDir(), 'bench.json'), JSON.stringify(out, null, 2));

  console.log(
    '\nunits | spawnMs | destroyMs | simMs/step | heapMB(delta) | A* ms/call | target us/call | pick ms/call | fps | frameMs(avg/p95) | longTasks | drawCalls | tris | heap MB',
  );
  for (const r of rows) {
    console.log(
      [
        r.n,
        r.spawnMs.toFixed(0),
        r.destroyMs.toFixed(0),
        (r.simMs / r.steps).toFixed(2),
        r.heapDeltaMB == null ? '-' : r.heapDeltaMB.toFixed(1),
        (r.pathMs / r.pathCalls).toFixed(2),
        ((r.targetMs / r.targetCalls) * 1000).toFixed(1),
        (r.pickMs / r.pickCalls).toFixed(2),
        r.fps,
        `${r.frameMsAvg.toFixed(1)}/${r.frameMsP95.toFixed(1)}`,
        r.longTasks,
        r.drawCalls,
        r.triangles,
        r.memory ?? '-',
      ].join(' | '),
    );
  }
  const worst = rows.reduce((a, r) => (r.landscapeCalls > a.landscapeCalls ? r : a), rows[0]);
  console.log(
    `\nlandscape: ${worst.landscapeCalls} draw calls (${worst.landscapeTris} tris), budget ${LANDSCAPE_DRAW_CALL_BUDGET}`,
  );
  const over = rows.filter((r) => r.landscapeCalls > LANDSCAPE_DRAW_CALL_BUDGET);
  if (over.length) {
    console.error(
      `landscape draw-call budget exceeded: ${over.map((r) => `${r.landscapeCalls} @ ${r.n} units`).join(', ')}`,
    );
    process.exitCode = 1;
  }

  const errs = rows.flatMap((r) => r.errors);
  if (errs.length) console.log('\npage errors:', errs);
  console.log('\nwrote review/bench.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
