import fs from 'fs';
import os from 'os';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';
import { installProbes, resetProbes, snapshotProbes, readSceneStats, readMemory, forceGc } from './perf-probes.mjs';

/**
 * Reproducible performance benchmark for entity scale.
 *
 * Usage:
 *   node scripts/bench.mjs [--units=50,100,200,400,800] [--scenario=soldiers|mixed|mixed-ai]
 *                          [--seed=777] [--steps=600] [--runs=3] [--profile=1] [--gc=1]
 *                          [--fog=1] [--out=review/bench.json]
 *
 * `soldiers` keeps the original benchmark (spawn N soldiers, measure A*,
 * target acquisition, picking and render). `mixed` builds a reproducible
 * economy+combat scenario with workers, soldiers, resource orders, barracks and
 * opposing attack orders. `mixed-ai` additionally keeps both AIs attached.
 *
 * With `--profile=1` it installs `scripts/perf-probes.mjs`, which measures
 * per-step section timings (AI, pathfinding, units, FOW, rendering, ...) and
 * exact counters without changing game behaviour. Numbers are only comparable
 * on the same machine/browser; the FPS column is software-renderer-bound.
 */

const unitScales = String(cliArg('units', '50,100,200,400,800'))
  .split(',')
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n) && n >= 0);
const animalScales = String(cliArg('animals', '4,8,12,16'))
  .split(',')
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n) && n >= 0);
const seed = Number.parseInt(cliArg('seed', '777'), 10);
const scenario = String(cliArg('scenario', 'soldiers'));
const assertBudgets = process.argv.includes('--assert');
const steps = Math.max(60, Number.parseInt(cliArg('steps', '600'), 10));
const runs = Math.max(1, Number.parseInt(cliArg('runs', '1'), 10));
const profile = cliArg('profile', '1') !== '0';
const useGc = cliArg('gc', '1') !== '0';
const fog = cliArg('fog', '1') !== '0' ? 1 : 0;
const outFile = cliArg('out', 'review/bench.json');
const scales = scenario === 'fauna' ? animalScales : unitScales;

if (!['soldiers', 'mixed', 'mixed-ai', 'rigs', 'fauna', 'mixed-rigs'].includes(scenario)) {
  console.error(`unknown scenario "${scenario}" (use soldiers|mixed|mixed-ai|rigs|fauna|mixed-rigs)`);
  process.exit(1);
}

/** Structural budgets: independent of the machine, unlike FPS. */
const RIG_BUDGETS = {
  // Counts include the VSM shadow pass (main + shadow draw/triangle). The
  // worker baseline is the dressed mannequin; the animal baseline is the
  // consolidated alpaca (2 draws: mesh + shadow).
  worker: { drawCalls: 40, triangles: 40000 },
  animal: { drawCalls: 4, triangles: 5000 },
  mixedP95Ms: 16.6,
};

// The cultural landscape merges each feature into a single mesh, so its draw-call
// cost scales with the declared feature vocabulary, not with the number of
// segments. The budget is `CulturalLandscape.featureBudget * 2`:
//   - one mesh per drawable feature (`RENDERED_FEATURES.length`, the same bound the
//     E2E asserts in `tests/e2e/landscape.spec.ts`), so un-merging a road/path
//     into per-segment meshes exceeds it and fails;
//   - under VSMShadowMap three also renders every shadow *receiver* into the shadow
//     map (`object.castShadow || (object.receiveShadow && type === VSMShadowMap)`),
//     and every landscape mesh sets `receiveShadow`, so each merged mesh costs one
//     main-pass plus one shadow-pass draw.
const LANDSCAPE_DRAW_CALLS_PER_MESH = 2;

/** Build the requested scale scenario inside the page; returns spawn/micro data. */
async function setupScenario(page, n) {
  return page.evaluate(
    ({ N, scenarioName, seedValue }) => {
      const g = window.game;
      g.loop.stop();
      g.paused = false;
      const size = g.settings.mapSize;
      const center = g.camera.getTarget();
      let seedR = (0x2f6e2b1 ^ N) >>> 0;
      const rnd = () => {
        seedR = (seedR * 1103515245 + 12345) & 0x7fffffff;
        return seedR / 0x7fffffff;
      };

      const clearUnits = () => {
        for (const [id, u] of [...g.units]) {
          u.removeFromScene();
          g.units.delete(id);
        }
        for (const p of g.players) p.populationUsed = 0;
      };
      const clearWildlife = () => {
        for (const a of g.wildlife.animals) {
          a.group.removeFromParent();
          a.rig?.dispose();
        }
        g.wildlife.animals.length = 0;
        g.wildlife.time = 0;
      };
      const spawnFauna = (count, cx, cz) => {
        const capped = Math.min(count, 16);
        const spawns = [];
        for (let i = 0; i < capped; i++) {
          const ang = i * 2.399963229728653;
          const radius = 8 + (i % 4) * 3;
          spawns.push({ id: 'llama', x: cx + Math.cos(ang) * radius, z: cz + Math.sin(ang) * radius, scale: 1 });
        }
        g.wildlife.spawn(spawns, (x, z) => g.terrain.getHeight(x, z));
      };
      const spawnWorkers = (count, cx, cz) => {
        for (let i = 0; i < count; i++) {
          const ring = 4 + Math.sqrt(i + 1) * 2.1;
          const ang = i * 2.399963229728653;
          const u = g.spawnScriptedUnit('worker', 0, cx + Math.cos(ang) * ring, cz + Math.sin(ang) * ring);
          const node = g.economy.findNearestNode(['food', 'wood', 'silver', 'stone'][i % 4], u.pos.x, u.pos.z);
          if (node) u.issueOrder({ kind: 'gather', entityId: node.id });
        }
      };
      const spawnArmy = (count, cx, cz) => {
        const army = [];
        for (let i = 0; i < count; i++) {
          const owner = i % 2;
          const ring = 6 + Math.sqrt(i + 1) * 2.1;
          const ang = i * 2.399963229728653;
          army.push(g.spawnScriptedUnit('soldier', owner, cx + Math.cos(ang) * ring, cz + Math.sin(ang) * ring));
        }
        for (const u of army) {
          const enemies = army.filter((e) => e.owner !== u.owner);
          if (enemies.length) u.issueOrder({ kind: 'attack', entityId: enemies[u.id % enemies.length].id }, true);
        }
      };

      let t = performance.now();
      if (scenarioName === 'soldiers') {
        const cols = Math.ceil(Math.sqrt(N));
        const spacing = Math.max(3, Math.min(8, 120 / cols));
        for (let i = 0; i < N; i++) {
          const x = center.x + ((i % cols) - cols / 2) * spacing;
          const z = center.z + (Math.floor(i / cols) - cols / 2) * spacing;
          g.spawnScriptedUnit('soldier', 0, x, z);
        }
      } else if (scenarioName === 'mixed' || scenarioName === 'mixed-ai') {
        const cx = size / 2;
        const cz = size / 2;
        const clusterA = g.findLandNear(cx - 18, cz, 30);
        const clusterB = g.findLandNear(cx + 18, cz, 30);
        const ids = [[], []];
        const kinds = ['worker', 'worker', 'soldier', 'soldier', 'soldier'];
        for (let i = 0; i < N; i++) {
          const owner = i % 2;
          const cluster = owner === 0 ? clusterA : clusterB;
          const kind = i % 23 === 0 ? 'scout' : kinds[i % kinds.length];
          const ring = 3 + Math.sqrt(i + 1) * 2.1;
          const ang = i * 2.399963229728653;
          const u = g.spawnScriptedUnit(
            kind,
            owner,
            cluster.x + Math.cos(ang) * ring + (rnd() - 0.5) * 1.5,
            cluster.z + Math.sin(ang) * ring + (rnd() - 0.5) * 1.5,
          );
          ids[owner].push(u);
          if (kind === 'worker') {
            const resource = ['food', 'wood', 'silver', 'stone'][i % 4];
            const node = g.economy.findNearestNode(resource, u.pos.x, u.pos.z);
            if (node) u.issueOrder({ kind: 'gather', entityId: node.id });
          }
        }
        for (const owner of [0, 1]) {
          const enemies = ids[1 - owner];
          for (const u of ids[owner]) {
            if (u.kind === 'worker' || u.kind === 'scout' || enemies.length === 0) continue;
            u.issueOrder({ kind: 'attack', entityId: enemies[u.id % enemies.length].id }, true);
          }
          const base = g.playerCenter(owner);
          g.spawnScriptedBuilding('barracks', owner, base.x + 10, base.z + 10);
        }
        if (scenarioName === 'mixed') {
          g.ais.length = 0;
        } else {
          g.ais.length = 0;
          // Keep the AIs attached but prevent them from changing the unit count
          // mid-measurement; they still manage workers and run every decision loop.
          g.settings.populationCap = 0;
          g.addAI(0, 'normal');
          g.addAI(1, 'normal');
        }
      } else {
        // Rig/fauna scenarios start from a clean population so the incremental
        // cost is attributable to the requested workers and animals.
        g.ais.length = 0;
        clearUnits();
        clearWildlife();
        if (scenarioName === 'fauna') {
          spawnFauna(N, center.x, center.z);
        } else if (scenarioName === 'rigs') {
          spawnWorkers(N, center.x, center.z);
        } else {
          spawnWorkers(N, center.x, center.z);
          spawnArmy(Math.max(0, Math.round(N / 2)), center.x, center.z);
          spawnFauna(8, center.x, center.z);
        }
      }
      const spawnMs = performance.now() - t;

      // Deterministic microbenchmarks, independent of the scale run.
      t = performance.now();
      const pathCalls = 60;
      for (let i = 0; i < pathCalls; i++) {
        g.pathfinder.pathfind(rnd() * size, rnd() * size, rnd() * size, rnd() * size);
      }
      const pathMs = performance.now() - t;

      t = performance.now();
      const targetCalls = 400;
      for (let i = 0; i < targetCalls; i++) g.enemiesNear(rnd() * size, rnd() * size, 15, 0);
      const targetMs = performance.now() - t;

      t = performance.now();
      const pickCalls = 50;
      for (let i = 0; i < pickCalls; i++) g.pickAt(200 + (i % 800), 150 + (i % 500));
      const pickMs = performance.now() - t;

      g.__benchClock = 1;
      const units = [...g.units.values()].filter((u) => !u.dead);
      return {
        spawnMs,
        micro: {
          pathMsPerCall: pathMs / pathCalls,
          targetUsPerCall: (targetMs / targetCalls) * 1000,
          pickMsPerCall: pickMs / pickCalls,
        },
        startUnits: units.length,
        startWorkers: units.filter((u) => u.kind === 'worker').length,
        startMilitary: units.filter((u) => u.kind !== 'worker' && u.kind !== 'scout').length,
        animals: g.wildlife.animals.length,
        riggedUnits: units.filter((u) => !!u.rig).length,
        riggedAnimals: g.wildlife.animals.filter((a) => !!a.rig).length,
        ais: g.ais.length,
        seed: seedValue,
      };
    },
    { N: n, scenarioName: scenario, seedValue: seed },
  );
}

/** Fixed-step run; re-issues orders every simulated second so combat keeps flowing. */
async function runSteps(page) {
  return page.evaluate(
    ({ stepCount, driveOrders }) => {
      const g = window.game;
      const dt = 1 / 60;
      let clock = g.__benchClock ?? 0;
      const wallStart = performance.now();

      const drive = () => {
        const units = [...g.units.values()].filter((u) => !u.dead);
        const byOwner = [[], []];
        for (const u of units) if (byOwner[u.owner]) byOwner[u.owner].push(u);
        for (const u of units) {
          const order = u.orderQueue[0];
          if (u.kind === 'worker') {
            if (!order) {
              const resource = ['food', 'wood', 'silver', 'stone'][u.id % 4];
              const node = g.economy.findNearestNode(resource, u.pos.x, u.pos.z);
              if (node) u.issueOrder({ kind: 'gather', entityId: node.id });
            }
          } else if (u.kind !== 'scout') {
            if (!order || (order.kind !== 'attack' && order.kind !== 'attack_move')) {
              const enemies = byOwner[1 - u.owner] ?? [];
              if (enemies.length) {
                u.issueOrder({ kind: 'attack', entityId: enemies[u.id % enemies.length].id }, true);
              }
            }
          }
        }
      };

      for (let i = 0; i < stepCount; i++) {
        if (driveOrders && i % 60 === 0) drive();
        g.update(dt, clock);
        clock += dt;
      }
      g.__benchClock = clock;
      return { wallMs: performance.now() - wallStart, steps: stepCount, ended: g.hasEnded() };
    },
    { stepCount: steps, driveOrders: scenario !== 'soldiers' },
  );
}

async function measure(browser, base, n, runIndex) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const params = new URLSearchParams({ play: '1', seed: String(seed), low: '1', fog: String(fog) });
  if (scenario === 'rigs' || scenario === 'mixed-rigs') {
    params.set('civ', 'caral');
    params.set('period', '0');
  }
  if (scenario === 'fauna' || scenario === 'mixed-rigs') params.set('map', 'altiplano');
  await page.goto(`${base}/?${params}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
  await page.waitForTimeout(1200);

  const setup = await setupScenario(page, n);

  if (profile) await installProbes(page, { sampleEvery: 1 });

  // Warm up caches/model instances without recording.
  await page.evaluate(() => {
    const g = window.game;
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
  });
  if (profile) await resetProbes(page);

  let memoryBefore = null;
  if (useGc) {
    await forceGc(page);
    memoryBefore = await readMemory(page);
  }

  const loop = await runSteps(page);
  const memoryAfterNoGc = await readMemory(page);
  if (useGc) await forceGc(page);
  const memoryAfterGc = await readMemory(page);

  const sim = profile ? await snapshotProbes(page) : null;
  const scene = await readSceneStats(page);

  // Render pass: max zoom, direct renderer so renderer.info is meaningful.
  await page.evaluate(() => {
    const g = window.game;
    g.camera.setHeight(1e9);
    window.__directRender = true;
    g.loop.start();
  });
  await page.waitForTimeout(500);
  if (profile) await resetProbes(page);
  const frame = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const longTasks = [];
        try {
          const po = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) longTasks.push(entry.duration);
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
            const at = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))];
            resolve({
              samples: times.length,
              frameMsAvg: times.reduce((s, x) => s + x, 0) / times.length,
              frameMsP50: at(0.5),
              frameMsP95: at(0.95),
              frameMsP99: at(0.99),
              longTasks: longTasks.length,
              longTaskMs: longTasks.reduce((s, x) => s + x, 0),
            });
          } else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );
  const render = profile ? await snapshotProbes(page) : null;
  const renderInfo = await page.evaluate(() => {
    const g = window.game;
    const info = g.renderer.info;
    const gl = g.renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const vendor = debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    return {
      fps: g.loop.getFps(),
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      quality: g.settings.quality,
      renderer,
      vendor,
      software: /swiftshader|llvmpipe|software/i.test(`${renderer} ${vendor}`),
    };
  });

  // Isolate the animated rigs' draw calls/triangles by hiding the unit and fauna
  // groups (visible vs hidden) at max zoom, keeping shadows/post-processing the same.
  const rigCost = await page.evaluate(() => {
    const g = window.game;
    g.loop.stop();
    window.__directRender = true;
    g.camera.setHeight(1e9);
    const unitRoots = [...g.units.values()].filter((u) => !u.dead && u.rig).map((u) => u.rig.root);
    const animalRoots = g.wildlife.animals.filter((a) => a.rig).map((a) => a.group);
    const sample = () => {
      g.renderer.render(g.scene, g.camera.camera);
      return { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
    };
    const hide = (roots, visible) => {
      for (const root of roots) root.visible = visible;
    };
    const shown = sample();
    hide(unitRoots, false);
    const unitsHidden = sample();
    hide(unitRoots, true);
    hide(animalRoots, false);
    const animalsHidden = sample();
    hide(animalRoots, true);
    hide(unitRoots, false);
    hide(animalRoots, false);
    const allHidden = sample();
    hide(unitRoots, true);
    hide(animalRoots, true);
    const unitCalls = shown.calls - unitsHidden.calls;
    const unitTris = shown.tris - unitsHidden.tris;
    const animalCalls = shown.calls - animalsHidden.calls;
    const animalTris = shown.tris - animalsHidden.tris;
    return {
      units: unitRoots.length,
      animals: animalRoots.length,
      unitCalls,
      unitTris,
      animalCalls,
      animalTris,
      combinedCalls: shown.calls - allHidden.calls,
      combinedTris: shown.tris - allHidden.tris,
      perWorkerCalls: unitRoots.length ? unitCalls / unitRoots.length : null,
      perWorkerTris: unitRoots.length ? unitTris / unitRoots.length : null,
      perAnimalCalls: animalRoots.length ? animalCalls / animalRoots.length : null,
      perAnimalTris: animalRoots.length ? animalTris / animalRoots.length : null,
    };
  });

  // Isolate the cultural landscape's draw calls (visible vs hidden) at max zoom.
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
      landscapeMeshes: group ? group.children.length : 0,
      landscapeFeatureBudget: (g.landscape && g.landscape.featureBudget) || 0,
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
  const simMsPerStep = sim ? (sim.labels.total?.mean ?? null) : loop.wallMs / loop.steps;
  return {
    n,
    run: runIndex,
    scenario,
    seed,
    spawnMs: setup.spawnMs,
    startUnits: setup.startUnits,
    startWorkers: setup.startWorkers,
    startMilitary: setup.startMilitary,
    animals: setup.animals,
    riggedUnits: setup.riggedUnits,
    riggedAnimals: setup.riggedAnimals,
    ais: setup.ais,
    micro: setup.micro,
    wallMs: loop.wallMs,
    steps: loop.steps,
    ended: loop.ended,
    simMsPerStep,
    sim,
    counts: sim ? sim.counts : null,
    counters: sim ? sim.counters : null,
    first: sim ? sim.first : null,
    gathered: sim ? sim.gathered : null,
    losses: sim ? sim.losses : null,
    byResource: sim ? sim.byResource : null,
    buildingsByOwner: sim ? sim.buildingsByOwner : null,
    warnings: sim ? sim.warnings : [],
    memory: {
      beforeMB: memoryBefore ? memoryBefore.usedMB : null,
      afterNoGcMB: memoryAfterNoGc ? memoryAfterNoGc.usedMB : null,
      afterGcMB: memoryAfterGc ? memoryAfterGc.usedMB : null,
      retainedDeltaMB: memoryBefore && memoryAfterGc ? memoryAfterGc.usedMB - memoryBefore.usedMB : null,
      grossDeltaMB: memoryBefore && memoryAfterNoGc ? memoryAfterNoGc.usedMB - memoryBefore.usedMB : null,
    },
    frame,
    renderMs: render ? render.labels.render : null,
    renderCounts: render ? render.counts : null,
    gpu: renderInfo,
    rigCost,
    scene,
    landscape,
    destroyMs,
    errors,
  };
}

function medianRow(rows) {
  const sorted = [...rows].sort((a, b) => (a.simMsPerStep ?? 0) - (b.simMsPerStep ?? 0));
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium(useGc ? { args: ['--js-flags=--expose-gc'] } : {});
  const rows = [];
  try {
    for (const n of scales) {
      process.stdout.write(`bench: ${n} units (${scenario})... `);
      const perRun = [];
      for (let r = 0; r < runs; r++) perRun.push(await measure(browser, base, n, r));
      const row = { ...medianRow(perRun) };
      row.allRuns = perRun;
      rows.push(row);
      console.log(`done (${row.simMsPerStep.toFixed(2)} ms/step, ${row.gpu.drawCalls} draws)`);
    }
  } finally {
    await browser.close();
    await close();
  }

  const out = {
    env: {
      seed,
      scenario,
      unitScales,
      animalScales,
      steps,
      runs,
      profile,
      fog,
      viewport: '1280x800',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: os.cpus()[0]?.model ?? 'unknown',
      commit: process.env.GIT_COMMIT ?? null,
    },
    rows,
    date: new Date().toISOString(),
  };
  const outPath = path.resolve(outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  const fmt = (value, digits = 2) => (value == null ? '-' : value.toFixed(digits));
  const firstGpu = rows[0]?.gpu;
  if (firstGpu) {
    console.log(
      `\nrenderer: ${firstGpu.renderer} (${firstGpu.software ? 'software' : 'hardware'}), quality=${firstGpu.quality}`,
    );
  }
  console.log(
    '\nn | sim p50/p95/p99 ms | AI p50/p95/p99 ms | path p50/p95/p99 ms | units/workers/military | animals | paths/req/fail | fps | frame avg/p95 | draws | tris | heap MB',
  );
  for (const r of rows) {
    const labels = r.sim?.labels ?? {};
    const cell = (label) => {
      const s = labels[label];
      return s ? `${fmt(s.p50)}/${fmt(s.p95)}/${fmt(s.p99)}` : '-';
    };
    const counts = r.counts ?? {};
    console.log(
      [
        r.n,
        cell('total'),
        cell('ai'),
        cell('pathfinding'),
        `${counts.units ?? '-'}/${counts.workers ?? '-'}/${counts.military ?? '-'}`,
        `${r.animals ?? 0}`,
        `${counts.activePaths ?? '-'}/${r.counters?.pathRequests ?? '-'}/${r.counters?.pathFailures ?? '-'}`,
        r.gpu.fps,
        `${fmt(r.frame.frameMsAvg, 1)}/${fmt(r.frame.frameMsP95, 1)}`,
        r.gpu.drawCalls,
        r.gpu.triangles,
        fmt(r.memory.afterGcMB, 1),
      ].join(' | '),
    );
  }

  const rigRows = rows.filter((r) => (r.rigCost?.units ?? 0) + (r.rigCost?.animals ?? 0) > 0);
  if (rigRows.length) {
    console.log(
      '\nrigs | units/animals | worker draws/tris | animal draws/tris | combined draws/tris | rigs p50/p95 ms',
    );
    for (const r of rows) {
      const c = r.rigCost;
      if (!c) continue;
      const rigs = r.sim?.labels?.rigs;
      console.log(
        [
          r.n,
          `${c.units}/${c.animals}`,
          `${fmt(c.perWorkerCalls, 1)}/${fmt(c.perWorkerTris, 0)}`,
          `${fmt(c.perAnimalCalls, 1)}/${fmt(c.perAnimalTris, 0)}`,
          `${c.combinedCalls}/${c.combinedTris}`,
          rigs ? `${fmt(rigs.p50)}/${fmt(rigs.p95)}` : '-',
        ].join(' | '),
      );
    }
  }

  const worst = rows.reduce((a, r) => (r.landscape.landscapeCalls > a.landscape.landscapeCalls ? r : a), rows[0]);
  const budgetOf = (r) => r.landscape.landscapeFeatureBudget * LANDSCAPE_DRAW_CALLS_PER_MESH;
  console.log(
    `\nlandscape: ${worst.landscape.landscapeCalls} draw calls (${worst.landscape.landscapeTris} tris, ${worst.landscape.landscapeMeshes} meshes), budget <= ${budgetOf(worst)}`,
  );
  const missing = rows.filter((r) => !(r.landscape.landscapeCalls > 0));
  const over = rows.filter((r) => r.landscape.landscapeCalls > budgetOf(r));
  if (missing.length) {
    console.error(`landscape layer not drawn (0 draw calls) at ${missing.map((r) => r.n).join(', ')} units`);
    process.exitCode = 1;
  }
  if (over.length) {
    console.error(
      `landscape draw-call budget exceeded: ${over.map((r) => `${r.landscape.landscapeCalls} @ ${r.n} units (budget ${budgetOf(r)})`).join(', ')}`,
    );
    process.exitCode = 1;
  }

  if (assertBudgets) {
    const failures = [];
    for (const r of rows) {
      const c = r.rigCost;
      if (!c) continue;
      if (scenario === 'rigs' && c.units > 0) {
        if (r.riggedUnits !== r.startWorkers)
          failures.push(`${r.n}: only ${r.riggedUnits}/${r.startWorkers} workers rigged`);
        if (c.perWorkerCalls > RIG_BUDGETS.worker.drawCalls) {
          failures.push(`${r.n}: ${fmt(c.perWorkerCalls, 1)} worker draw calls > ${RIG_BUDGETS.worker.drawCalls}`);
        }
        if (c.perWorkerTris > RIG_BUDGETS.worker.triangles) {
          failures.push(`${r.n}: ${fmt(c.perWorkerTris, 0)} worker triangles > ${RIG_BUDGETS.worker.triangles}`);
        }
      }
      if ((scenario === 'fauna' || scenario === 'mixed-rigs') && c.animals > 0) {
        if (r.riggedAnimals !== r.animals) failures.push(`${r.n}: only ${r.riggedAnimals}/${r.animals} animals rigged`);
        if (c.perAnimalCalls > RIG_BUDGETS.animal.drawCalls) {
          failures.push(`${r.n}: ${fmt(c.perAnimalCalls, 1)} animal draw calls > ${RIG_BUDGETS.animal.drawCalls}`);
        }
        if (c.perAnimalTris > RIG_BUDGETS.animal.triangles) {
          failures.push(`${r.n}: ${fmt(c.perAnimalTris, 0)} animal triangles > ${RIG_BUDGETS.animal.triangles}`);
        }
      }
      if (scenario === 'mixed-rigs') {
        const p95 = r.sim?.labels?.total?.p95;
        if (p95 != null && p95 > RIG_BUDGETS.mixedP95Ms) {
          failures.push(`${r.n}: sim p95 ${fmt(p95)} ms > ${RIG_BUDGETS.mixedP95Ms} ms`);
        }
      }
    }
    if (failures.length) {
      console.error(`\nbudget failures:\n- ${failures.join('\n- ')}`);
      process.exitCode = 1;
    } else {
      console.log('\nbudgets: ok');
    }
  }

  const warnings = rows.flatMap((r) => r.warnings ?? []);
  if (warnings.length) console.log('\nprobe warnings:', [...new Set(warnings)]);
  const errs = rows.flatMap((r) => r.errors);
  if (errs.length) console.log('\npage errors:', errs);
  console.log(`\nwrote ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
