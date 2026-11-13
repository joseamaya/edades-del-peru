import fs from 'fs';
import os from 'os';
import path from 'path';
import { launchChromium, withViteServer, cliArg, useGpu, isSoftwareRenderer, readGlRenderer } from './lib.mjs';
import { installProbes, resetProbes, snapshotProbes, readSceneStats, readMemory, forceGc } from './perf-probes.mjs';

/**
 * Reproducible performance benchmark for entity scale.
 *
 * Usage:
 *   node scripts/bench.mjs [--units=50,100,200,400,800] [--scenario=soldiers|mixed|mixed-ai|mounted|siege|tank|vehicles]
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
 * on the same machine/browser.
 *
 * Render side: `--gpu` (or `GPU=1`) runs on the host GPU instead of SwiftShader and makes the
 * run fail when the page still renders in software (with or without `--assert`). `--postfx=1`
 * measures the shipped frame (post-processing and water refraction on), `--framing=overview|mid|close`
 * sets the camera and `--viewport=WxH` the canvas. Off by default because `bench:check` runs many
 * rows: `--passes=1` adds the per-pass breakdown (main/shadow/refraction/quads + submit ms) and
 * `--scale-sweep=1` the pixel-ratio sweep (direct mode only).
 */

const cpuModel = os.cpus()[0]?.model ?? 'unknown';
const cpuCount = os.cpus().length;

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
const gpu = useGpu();
const postfx = cliArg('postfx', '0') === '1';
const framing = String(cliArg('framing', 'overview'));
const [viewportWidth, viewportHeight] = String(cliArg('viewport', '1280x800'))
  .split('x')
  .map((v) => Number.parseInt(v, 10));
const measurePasses = cliArg('passes', '0') === '1';
const scaleSweep = cliArg('scale-sweep', '0') === '1';

if (!['overview', 'mid', 'close'].includes(framing)) {
  console.error(`unknown framing "${framing}" (use overview|mid|close)`);
  process.exit(1);
}
if (!(viewportWidth > 0) || !(viewportHeight > 0)) {
  console.error('invalid --viewport (use WxH, e.g. 1920x1080)');
  process.exit(1);
}

if (
  ![
    'soldiers',
    'mixed',
    'mixed-ai',
    'mounted',
    'siege',
    'tank',
    'vehicles',
    'rigs',
    'fauna',
    'mixed-rigs',
    'fortifications',
    'group-move',
  ].includes(scenario)
) {
  console.error(
    `unknown scenario "${scenario}" (use soldiers|mixed|mixed-ai|mounted|siege|tank|vehicles|rigs|fauna|mixed-rigs|fortifications|group-move)`,
  );
  process.exit(1);
}

/** Structural budgets: independent of the machine, unlike FPS. */
const RIG_BUDGETS = {
  // Counts include the VSM shadow pass (main + shadow draw/triangle). The
  // worker baseline is the dressed mannequin; the animal baseline is the
  // consolidated alpaca (2 draws: mesh + shadow).
  worker: { drawCalls: 40, triangles: 40000 },
  mounted: { drawCalls: 40, triangles: 12000 },
  siege: { drawCalls: 24, triangles: 12000 },
  tank: { drawCalls: 12, triangles: 12000 },
  vehicles: { drawCalls: 20, triangles: 6000 },
  animal: { drawCalls: 4, triangles: 5000 },
  mixedP95Ms: 16.6,
  fortificationsP99Ms: 12,
  groupMovePathP99Ms: 4,
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
      const spawnVehicle = (kind, count, cx, cz) => {
        for (let i = 0; i < count; i++) {
          const ring = 4 + Math.sqrt(i + 1) * 2.4;
          const ang = i * 2.399963229728653;
          g.spawnScriptedUnit(kind, 0, cx + Math.cos(ang) * ring, cz + Math.sin(ang) * ring);
        }
      };
      const spawnCavalry = (count, cx, cz) => {
        for (let i = 0; i < count; i++) {
          const ring = 4 + Math.sqrt(i + 1) * 2.4;
          const ang = i * 2.399963229728653;
          g.spawnScriptedUnit('cavalry', 0, cx + Math.cos(ang) * ring, cz + Math.sin(ang) * ring);
        }
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
      } else if (scenarioName === 'group-move') {
        g.ais.length = 0;
        clearUnits();
        const ids = [];
        for (let i = 0; i < N; i++) {
          const ring = 3 + Math.sqrt(i + 1) * 1.3;
          const ang = i * 2.399963229728653;
          ids.push(
            g.spawnScriptedUnit('soldier', 0, center.x + Math.cos(ang) * ring, center.z + Math.sin(ang) * ring).id,
          );
        }
        g.selectUnits(ids);
        const goal = g.findLandNear(center.x + 24, center.z, 30);
        g.commandMoveToWorld(goal.x, goal.z);
      } else if (scenarioName === 'fortifications') {
        g.ais.length = 0;
        clearUnits();
        for (const p of g.players) p.resources = { food: 1e6, wood: 1e6, silver: 1e6, stone: 1e6 };
        const wallX = center.x;
        for (let i = 0; i < N; i++) {
          const wallZ = center.z + (i - (N - 1) / 2) * 2;
          g.executeCommand({ kind: 'place', building: 'wall', x: wallX, z: wallZ });
        }
        for (let i = 0; i < Math.max(1, Math.round(N / 2)); i++) {
          const u = g.spawnScriptedUnit('soldier', 0, wallX - 8 - (i % 4), center.z + (i % 7) - 3);
          u.issueOrder({ kind: 'move', target: { x: wallX + 8, z: center.z + (i % 7) - 3 } });
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
        } else if (scenarioName === 'mounted') {
          spawnCavalry(N, center.x, center.z);
        } else if (scenarioName === 'siege') {
          spawnVehicle('artillery', Math.ceil(N / 2), center.x, center.z);
          spawnVehicle('mortar', Math.floor(N / 2), center.x, center.z);
        } else if (scenarioName === 'tank') {
          spawnVehicle('tank', N, center.x, center.z);
        } else if (scenarioName === 'vehicles') {
          spawnVehicle('hussar', Math.ceil(N / 3), center.x, center.z);
          spawnVehicle('anti_air', Math.floor(N / 3), center.x, center.z);
          spawnVehicle('nuclear', Math.floor(N / 3), center.x, center.z);
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
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const params = new URLSearchParams({
    play: '1',
    seed: String(seed),
    low: postfx ? '0' : '1',
    fog: String(fog),
  });
  if (scenario === 'rigs' || scenario === 'mixed-rigs') {
    params.set('civ', 'caral');
    params.set('period', '0');
  }
  if (scenario === 'mounted' || scenario === 'siege') {
    params.set('civ', 'realistas');
    params.set('period', '6');
  }
  if (scenario === 'tank' || scenario === 'vehicles') {
    params.set('civ', 'republica');
    params.set('period', '9');
  }
  if (scenario === 'fauna' || scenario === 'mixed-rigs') params.set('map', 'altiplano');
  // The software fallback turns the cinematic set off before the bench pins quality; `?cine=1`
  // keeps `--postfx` measuring the shipped frame (bloom, grading and water refraction).
  if (postfx) params.set('cine', '1');
  await page.goto(`${base}/?${params}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
  await page.waitForTimeout(1200);

  // Pin the requested preset: the governor would otherwise downgrade mid-sample on a slow
  // machine and the row would describe a different scene than the one requested.
  await page.evaluate(
    (quality) => {
      const g = window.game;
      g.qualityGovernor.setUserQuality(quality);
      g.qualityGovernor.update = () => {};
    },
    postfx ? 'high' : 'low',
  );

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

  // Render pass at the requested framing. `renderer.info` only describes the last render call
  // of a frame, so the draw calls used below come from the per-pass breakdown.
  await page.evaluate(
    ({ framing, direct }) => {
      const g = window.game;
      window.__directRender = direct;
      g.camera.setHeight(framing === 'overview' ? 1e9 : framing === 'mid' ? 90 : 24);
      for (let i = 0; i < 30; i++) g.camera.update(1 / 30, i / 30);
      g.camera.camera.updateMatrixWorld();
      g.loop.start();
    },
    { framing, direct: !postfx },
  );
  await page.waitForTimeout(500);
  if (profile) await resetProbes(page);
  const frame = await page.evaluate(
    async ({ sweep, reason }) => {
      const g = window.game;
      const longTasks = [];
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) longTasks.push(entry.duration);
        });
        po.observe({ type: 'longtask' });
      } catch {
        /* longtask unsupported */
      }
      const stats = (times) => {
        times.sort((a, b) => a - b);
        const at = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))];
        return {
          samples: times.length,
          frameMsAvg: times.reduce((s, x) => s + x, 0) / times.length,
          frameMsP50: at(0.5),
          frameMsP95: at(0.95),
          frameMsP99: at(0.99),
        };
      };
      const sample = (ms) =>
        new Promise((done) => {
          const times = [];
          let last = performance.now();
          const end = last + ms;
          const step = () => {
            const now = performance.now();
            times.push(now - last);
            last = now;
            if (now >= end) done(stats(times));
            else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      // Scaling the drawing buffer separates GPU-bound (frame follows the pixels) from submit/CPU-bound
      // (frame barely moves). `setPixelRatioOverride` now reaches the renderer, the post-processing
      // targets (#458) and the refraction RT, so the sweep is valid with `--postfx` too.
      const ratios = sweep ? [1, 0.75, 0.5] : [1];
      const previous = g.pixelRatioOverride;
      const byScale = [];
      for (const ratio of ratios) {
        g.runtime.setPixelRatioOverride(ratio);
        await new Promise((done) => setTimeout(done, 250));
        byScale.push({ ratio, ...(await sample(1200)) });
      }
      g.runtime.setPixelRatioOverride(previous);
      return {
        ...byScale[0],
        byScale,
        sweepSkipped: sweep ? null : reason,
        longTasks: longTasks.length,
        longTaskMs: longTasks.reduce((s, x) => s + x, 0),
      };
    },
    {
      sweep: scaleSweep,
      reason: scaleSweep ? null : 'the sweep was disabled',
    },
  );

  const render = profile ? await snapshotProbes(page) : null;

  // Per-pass breakdown: wrap the render entry points for a few frames and keep the median.
  // `scene` includes the shadow pass; `main` is what is left of it, so the buckets add up to
  // the frame instead of double counting the shadow map.
  const passes = measurePasses
    ? await page.evaluate(
        ({ frames, framing }) => {
          const g = window.game;
          const runtime = g.runtime;
          const info = g.renderer.info;
          const waterTarget = g.water?.refractionRT ?? null;
          info.autoReset = false;

          const zero = () => ({ ms: 0, calls: 0, tris: 0 });
          const empty = () => ({
            frame: zero(),
            scene: zero(),
            refraction: zero(),
            quad: zero(),
            shadowScene: zero(),
            shadowRefraction: zero(),
          });
          let pending = empty();
          let current = 'scene';
          const samples = [];
          const hit = (key, ms, calls, tris) => {
            const b = pending[key];
            b.ms += ms;
            b.calls += calls;
            b.tris += tris;
          };

          const origRender = g.renderer.render.bind(g.renderer);
          g.renderer.render = (scene, camera) => {
            const target = g.renderer.getRenderTarget();
            const key = scene === g.scene ? (waterTarget && target === waterTarget ? 'refraction' : 'scene') : 'quad';
            current = key;
            const t0 = performance.now();
            const c0 = info.render.calls;
            const tr0 = info.render.triangles;
            const out = origRender(scene, camera);
            hit(key, performance.now() - t0, info.render.calls - c0, info.render.triangles - tr0);
            return out;
          };

          // three runs the shadow map inside every `renderer.render`, so a post-processed frame
          // pays for it twice. Measure that as the game does it instead of forcing one update.
          const shadow = g.renderer.shadowMap;
          const origShadow = shadow.render.bind(shadow);
          shadow.render = (...args) => {
            const t0 = performance.now();
            const c0 = info.render.calls;
            const tr0 = info.render.triangles;
            const out = origShadow(...args);
            const calls = info.render.calls - c0;
            if (calls > 0)
              hit(
                current === 'refraction' ? 'shadowRefraction' : 'shadowScene',
                performance.now() - t0,
                calls,
                info.render.triangles - tr0,
              );
            return out;
          };

          g.loop.stop();
          const frameOnce = () => {
            pending = empty();
            // Same per-frame call the loop makes: it fits the frustum and flags the single shadow update.
            runtime.frameShadows();
            const t0 = performance.now();
            runtime.render();
            pending.frame.ms = performance.now() - t0;
            samples.push(pending);
          };
          for (let i = 0; i < 5; i++) frameOnce();
          samples.length = 0;
          for (let i = 0; i < frames; i++) frameOnce();

          g.renderer.render = origRender;
          shadow.render = origShadow;
          info.autoReset = true;
          info.reset();

          // Derive one row per frame, then take medians: medians of different keys are not the
          // medians of their sum, so `other` is computed per frame instead of as a residual.
          const rows = samples.map((s) => {
            const main = {
              ms: Math.max(0, s.scene.ms - s.shadowScene.ms),
              calls: Math.max(0, s.scene.calls - s.shadowScene.calls),
              tris: Math.max(0, s.scene.tris - s.shadowScene.tris),
            };
            const refraction = {
              ms: Math.max(0, s.refraction.ms - s.shadowRefraction.ms),
              calls: Math.max(0, s.refraction.calls - s.shadowRefraction.calls),
              tris: Math.max(0, s.refraction.tris - s.shadowRefraction.tris),
            };
            const shadow = {
              ms: s.shadowScene.ms + s.shadowRefraction.ms,
              calls: s.shadowScene.calls + s.shadowRefraction.calls,
              tris: s.shadowScene.tris + s.shadowRefraction.tris,
            };
            return {
              frame: s.frame.ms,
              mainMs: main.ms,
              mainCalls: main.calls,
              mainTris: main.tris,
              refractionMs: refraction.ms,
              refractionCalls: refraction.calls,
              refractionTris: refraction.tris,
              shadowMs: shadow.ms,
              shadowCalls: shadow.calls,
              shadowTris: shadow.tris,
              quadMs: s.quad.ms,
              quadCalls: s.quad.calls,
              quadTris: s.quad.tris,
              otherMs: Math.max(0, s.frame.ms - main.ms - refraction.ms - shadow.ms - s.quad.ms),
              totalCalls: s.scene.calls + s.refraction.calls + s.quad.calls,
              totalTris: s.scene.tris + s.refraction.tris + s.quad.tris,
              shadowInRefraction: s.shadowRefraction.calls > 0,
            };
          });
          const median = (key) => {
            const values = rows.map((r) => r[key]).sort((a, b) => a - b);
            return values[Math.floor(values.length / 2)] ?? 0;
          };
          const percentile = (key, p) => {
            const values = rows.map((r) => r[key]).sort((a, b) => a - b);
            return values[Math.min(values.length - 1, Math.floor(values.length * p))] ?? 0;
          };
          const cell = (msKey, callsKey, trisKey) => ({
            ms: median(msKey),
            msP95: percentile(msKey, 0.95),
            calls: Math.round(median(callsKey)),
            tris: Math.round(median(trisKey)),
          });
          return {
            samples: frames,
            mode: window.__directRender ? 'direct' : 'postfx',
            framing,
            frame: { ms: median('frame'), msP95: percentile('frame', 0.95) },
            main: cell('mainMs', 'mainCalls', 'mainTris'),
            shadow: cell('shadowMs', 'shadowCalls', 'shadowTris'),
            refraction: cell('refractionMs', 'refractionCalls', 'refractionTris'),
            quad: cell('quadMs', 'quadCalls', 'quadTris'),
            other: { ms: median('otherMs'), msP95: percentile('otherMs', 0.95) },
            shadowFrames: {
              refraction: rows.filter((r) => r.shadowInRefraction).length,
              total: rows.length,
            },
            totals: { calls: Math.round(median('totalCalls')), tris: Math.round(median('totalTris')) },
          };
        },
        { frames: 40, framing },
      )
    : null;

  // One instrumented-free frame for the total counts: reset, render once, read. In postfx mode
  // `info` after the loop only describes the last quad pass, so it cannot be read as-is.
  const renderInfo = await page.evaluate(() => {
    const g = window.game;
    const info = g.renderer.info;
    g.loop.stop();
    g.runtime.frameShadows();
    info.autoReset = false;
    info.reset();
    g.runtime.render();
    const drawCalls = info.render.calls;
    const triangles = info.render.triangles;
    info.autoReset = true;
    info.reset();
    return {
      fps: g.loop.getFps(),
      drawCalls,
      triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs ? info.programs.length : null,
      quality: g.qualityGovernor.applied,
      requestedQuality: g.settings.quality,
      cinematic: g.postfx.cinematicEnabled,
    };
  });
  const gl = await readGlRenderer(page);
  renderInfo.renderer = gl.renderer;
  renderInfo.vendor = gl.vendor;
  renderInfo.software = isSoftwareRenderer(`${gl.renderer} ${gl.vendor}`);
  if (passes) {
    renderInfo.drawCalls = passes.totals.calls;
    renderInfo.triangles = passes.totals.tris;
  }

  // Isolate the animated rigs' draw calls/triangles by hiding the unit and fauna
  // groups (visible vs hidden) at max zoom, keeping shadows/post-processing the same.
  const rigCost = await page.evaluate(() => {
    const g = window.game;
    g.loop.stop();
    window.__directRender = true;
    g.camera.setHeight(1e9);
    for (let i = 0; i < 30; i++) g.camera.update(1 / 30, i / 30);
    g.camera.camera.updateMatrixWorld();
    const unitRoots = [...g.units.values()].filter((u) => !u.dead && u.rig).map((u) => u.rig.root);
    const animalRoots = g.wildlife.animals.filter((a) => a.rig).map((a) => a.group);
    // Every sample draws the shadow pass, so the shown/hidden delta cancels it instead of
    // attributing the whole shadow pass to the isolated group.
    const sample = () => {
      g.runtime.frameShadows();
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
    for (let i = 0; i < 30; i++) g.camera.update(1 / 30, i / 30);
    g.camera.camera.updateMatrixWorld();
    const sample = () => {
      g.runtime.frameShadows();
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

  // Ground cover is hidden at low quality; count the planned instances so the
  // structural budget still guards the planner.
  const cover = await page.evaluate(() => {
    const c = window.game.groundCover;
    if (!c) return { present: false };
    return {
      present: true,
      enabled: c.enabled,
      instances: c.instanceCount,
      chunks: c.chunkCount,
      budget: c.instanceBudget,
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
    passes,
    gpu: renderInfo,
    rigCost,
    scene,
    landscape,
    cover,
    destroyMs,
    errors,
  };
}

function medianRow(rows) {
  const sorted = [...rows].sort((a, b) => (a.simMsPerStep ?? 0) - (b.simMsPerStep ?? 0));
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {
  const loadBefore = os.loadavg().map((v) => Math.round(v * 100) / 100);
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
      viewport: `${viewportWidth}x${viewportHeight}`,
      gpu,
      postfx,
      framing,
      passes: measurePasses,
      scaleSweep,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: cpuModel,
      cpuCount: cpuCount,
      // Timing rows are only comparable when the host is idle: record it at both ends.
      loadavgBefore: loadBefore,
      loadavgAfter: os.loadavg().map((v) => Math.round(v * 100) / 100),
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
      `\nrenderer: ${firstGpu.renderer} (${firstGpu.software ? 'software' : 'hardware'}), quality=${firstGpu.quality}, cinematic=${firstGpu.cinematic}, mode=${postfx ? 'postfx' : 'direct'}, framing=${framing}, viewport=${viewportWidth}x${viewportHeight}`,
    );
  }
  if (gpu && rows.some((r) => r.gpu.software)) {
    console.error(
      `--gpu was requested but the page rendered in software (${firstGpu.renderer}). Try --gl=egl, --gl=angle-vulkan or run with a display.`,
    );
    process.exitCode = 1;
  }
  console.log(
    '\nn | sim p50/p95/p99 ms | AI p50/p95/p99 ms | path p50/p95/p99 ms | units/workers/military | animals | paths/req/fail | fps | frame avg/p95/p99 | draws (full frame) | tris | heap MB',
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
        `${fmt(r.frame.frameMsAvg, 1)}/${fmt(r.frame.frameMsP95, 1)}/${fmt(r.frame.frameMsP99, 1)}`,
        r.gpu.drawCalls,
        r.gpu.triangles,
        fmt(r.memory.afterGcMB, 1),
      ].join(' | '),
    );
  }

  if (rows.some((r) => r.passes)) {
    const cell = (b, unit = '') => (b ? `${fmt(b.ms, 2)}/${Math.round(b.calls)}${unit}` : '-');
    console.log(
      '\npasses (median CPU submit ms / draw calls per frame; main and refraction exclude the shadow pass they contain):',
    );
    console.log('n | submit | main | shadow | refraction | post quad | other (js/gl) | submit/frame | draws/unit');
    for (const r of rows) {
      const p = r.passes;
      if (!p) continue;
      const units = r.startUnits || r.n;
      console.log(
        [
          r.n,
          `${fmt(p.frame.ms, 2)}`,
          cell(p.main),
          cell(p.shadow),
          cell(p.refraction),
          cell(p.quad),
          fmt(p.other.ms, 2),
          `${fmt((100 * p.frame.ms) / (r.frame.frameMsP50 || p.frame.ms), 0)}%`,
          fmt(p.totals.calls / units, 1),
        ].join(' | '),
      );
    }
  }

  const sweepRow = rows.find((r) => (r.frame?.byScale?.length ?? 0) > 1);
  if (sweepRow) {
    const fmtScale = (s) => `${s.ratio}x: p50 ${fmt(s.frameMsP50, 1)} / p95 ${fmt(s.frameMsP95, 1)} ms`;
    console.log(`\nscale sweep (${sweepRow.n} units): ${sweepRow.frame.byScale.map(fmtScale).join(' | ')}`);
  } else if (rows[0]?.frame?.sweepSkipped) {
    console.log(`\nscale sweep skipped: ${rows[0].frame.sweepSkipped}`);
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
  const coverWorst = rows.reduce((a, r) => ((r.cover?.instances ?? 0) > (a.cover?.instances ?? 0) ? r : a), rows[0]);
  if (coverWorst?.cover?.present) {
    console.log(
      `\ncover: ${coverWorst.cover.instances} instances (${coverWorst.cover.chunks} chunks), budget <= ${coverWorst.cover.budget}`,
    );
  }
  const coverOver = rows.filter((r) => (r.cover?.instances ?? 0) > (r.cover?.budget ?? 0));
  if (coverOver.length) {
    console.error(
      `ground-cover instance budget exceeded: ${coverOver.map((r) => `${r.cover.instances} @ ${r.n}`).join(', ')}`,
    );
    process.exitCode = 1;
  }
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
      if (r.cover?.present) {
        if (r.cover.instances > r.cover.budget) {
          failures.push(`${r.n}: ${r.cover.instances} cover instances > ${r.cover.budget}`);
        }
      }
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
      if (
        (scenario === 'mounted' || scenario === 'siege' || scenario === 'tank' || scenario === 'vehicles') &&
        c.units > 0
      ) {
        const budget = RIG_BUDGETS[scenario];
        if (r.riggedUnits !== r.startMilitary)
          failures.push(`${r.n}: only ${r.riggedUnits}/${r.startMilitary} ${scenario} units rigged`);
        if (c.perWorkerCalls > budget.drawCalls) {
          failures.push(`${r.n}: ${fmt(c.perWorkerCalls, 1)} ${scenario} draw calls > ${budget.drawCalls}`);
        }
        if (c.perWorkerTris > budget.triangles) {
          failures.push(`${r.n}: ${fmt(c.perWorkerTris, 0)} ${scenario} triangles > ${budget.triangles}`);
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
      if (scenario === 'fortifications') {
        const p99 = r.sim?.labels?.total?.p99;
        if (p99 != null && p99 > RIG_BUDGETS.fortificationsP99Ms) {
          failures.push(`${r.n}: sim p99 ${fmt(p99)} ms > ${RIG_BUDGETS.fortificationsP99Ms} ms`);
        }
      }
      if (scenario === 'group-move') {
        const perCall = r.micro?.pathMsPerCall;
        if (perCall != null && perCall > RIG_BUDGETS.groupMovePathP99Ms) {
          failures.push(`${r.n}: A* ${fmt(perCall)} ms/call > ${RIG_BUDGETS.groupMovePathP99Ms} ms`);
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
