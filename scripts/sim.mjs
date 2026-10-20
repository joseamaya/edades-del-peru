import fs from 'fs';
import os from 'os';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';
import { installProbes } from './perf-probes.mjs';

/**
 * Headless AI-vs-AI match runner.
 *
 * Usage:
 *   node scripts/sim.mjs [--seeds=777,778,779] [--max=1200] [--difficulty=hard] [--p1=legendary]
 *                        [--player=ai|scripted] [--metrics=1] [--sample=5] [--out=review/ai-bench.json]
 *
 * Boots a skirmish, attaches an AI to both players and fast-forwards the
 * simulation (no rendering) until a side is defeated or the time cap is hit.
 * `--difficulty` sets player 0's AI profile and `--p1` player 1's (default
 * `normal`), so a run measures one profile against another. To remove the
 * player-0 positional bias, measure a difficulty in both seats (`--difficulty=D
 * --p1=normal` and `--difficulty=normal --p1=D`) and add the wins. Prints a
 * per-seed table and a summary. Deterministic per seed: `?noloop=1` keeps the
 * real-time loop from advancing the world before the fixed-step loop takes over
 * (the AI uses a seeded RNG), so it is a reliable baseline/regression signal.
 *
 * With `--metrics=1` it installs `scripts/perf-probes.mjs`: per-step AI/path
 * timings, first-soldier/first-attack times, created/lost units, buildings,
 * gathered resources and a sampled timeline (idle workers, stuck units, army).
 */

const DIFFICULTIES = ['easy', 'normal', 'hard', 'legendary'];
const seeds = String(cliArg('seeds', '777,778,779,780,781,782,783,784'))
  .split(',')
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n));
const maxSeconds = Number.parseInt(cliArg('max', '1200'), 10);
const difficulty = String(cliArg('difficulty', 'normal'));
const p1Difficulty = String(cliArg('p1', 'normal'));
// `--player=scripted` runs the greedy ScriptedPlayer bot as player 0 instead of an AI
const player = String(cliArg('player', 'ai'));
const metrics = cliArg('metrics', '1') !== '0';
const sampleSeconds = Math.max(1, Number.parseFloat(cliArg('sample', '5')));
const debug = cliArg('debug', '0') === '1';
const outFile = cliArg('out', 'review/ai-bench.json');
if (!['ai', 'scripted'].includes(player)) {
  console.error(`unknown player "${player}" (use ai|scripted)`);
  process.exit(1);
}
for (const d of [difficulty, p1Difficulty]) {
  if (!DIFFICULTIES.includes(d)) {
    console.error(`unknown difficulty "${d}" (use ${DIFFICULTIES.join('|')})`);
    process.exit(1);
  }
}

async function run(browser, base, seed) {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  const errors = [];
  const consoleMessages = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (metrics) {
    page.on('console', (msg) => {
      if (msg.type() === 'warning' || msg.type() === 'error' || msg.type() === 'info') {
        consoleMessages.push(msg.text());
      }
    });
  }
  await page.goto(`${base}/?play=1&seed=${seed}&low=1&fog=0&noloop=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });

  await page.evaluate(
    ({ diff, diff1, mode }) => {
      const g = window.game;
      g.loop.stop();
      g.paused = false;
      // set both seats (the constructor only adds a default AI for P1)
      g.ais.length = 0;
      if (mode !== 'scripted') g.addAI(0, diff);
      g.addAI(1, diff1);
    },
    { diff: difficulty, diff1: p1Difficulty, mode: player },
  );

  if (metrics) await installProbes(page, { sampleEvery: 5, maxSamples: 20000 });

  const result = await page.evaluate(
    ({ cap, mode, sample, wantDebug }) => {
      const g = window.game;
      const perf = window.__perf ?? null;
      const bot = mode === 'scripted' ? new window.ScriptedPlayer(g, 0) : null;
      const dt = 1 / 60;
      const maxSteps = Math.floor(cap / dt);
      const sampleEvery = Math.max(1, Math.round(sample / dt));
      const peak = { army: [0, 0], workers: [0, 0] };
      const initialBuildings = new Set(g.buildings.keys());
      const seenBuildings = new Set(initialBuildings);
      const createdBuildings = new Map();
      const firstByKind = {};
      const positions = new Map();
      const timeline = [];
      let stuckMax = 0;
      let blockedWorkersMax = 0;
      let idleMax = 0;
      let t = 0;
      let steps = 0;

      for (let i = 0; i < maxSteps; i++) {
        if (bot) bot.update(dt);
        g.update(dt, t);
        t += dt;
        steps++;
        if (i % sampleEvery === 0) {
          const units = [...g.units.values()].filter((u) => !u.dead);
          const workers = units.filter((u) => u.kind === 'worker');
          const military = units.filter((u) => u.kind !== 'worker' && u.kind !== 'scout');
          const idleWorkers = workers.filter((u) => !u.isBusy()).length;
          const activePaths = units.filter((u) => u.path && u.path.length > 0).length;
          const combatants = units.filter((u) => {
            const order = u.orderQueue && u.orderQueue[0];
            return order && (order.kind === 'attack' || order.kind === 'attack_move');
          }).length;

          for (const owner of [0, 1]) {
            peak.army[owner] = Math.max(peak.army[owner], military.filter((u) => u.owner === owner).length);
            peak.workers[owner] = Math.max(peak.workers[owner], workers.filter((u) => u.owner === owner).length);
          }
          idleMax = Math.max(idleMax, idleWorkers);

          for (const b of g.buildings.values()) {
            if (b.dead || seenBuildings.has(b.id)) continue;
            seenBuildings.add(b.id);
            createdBuildings.set(b.id, t);
            if (!firstByKind[b.kind]) firstByKind[b.kind] = t;
          }

          let stuck = 0;
          let blockedWorkers = 0;
          for (const u of units) {
            if (!u.path || u.path.length === 0 || u.garrisonedIn !== null) continue;
            const prev = positions.get(u.id);
            if (prev) {
              const moved = Math.hypot(u.pos.x - prev.x, u.pos.z - prev.z);
              if (moved < 0.5) {
                stuck++;
                if (u.kind === 'worker') blockedWorkers++;
              }
            }
            positions.set(u.id, { x: u.pos.x, z: u.pos.z });
          }
          stuckMax = Math.max(stuckMax, stuck);
          blockedWorkersMax = Math.max(blockedWorkersMax, blockedWorkers);

          const buildingsByOwner = [0, 0];
          for (const b of g.buildings.values()) {
            if (!b.dead && (b.owner === 0 || b.owner === 1)) buildingsByOwner[b.owner]++;
          }
          timeline.push({
            t: Math.round(t),
            units: units.length,
            workers: workers.length,
            workers0: workers.filter((u) => u.owner === 0).length,
            workers1: workers.filter((u) => u.owner === 1).length,
            military: military.length,
            military0: military.filter((u) => u.owner === 0).length,
            military1: military.filter((u) => u.owner === 1).length,
            idleWorkers,
            stuck,
            blockedWorkers,
            activePaths,
            combatants,
            buildings: buildingsByOwner,
            resources: { ...g.players[0].resources },
            resources1: { ...g.players[1].resources },
            enemyBuildings: buildingsByOwner[1],
          });
        }
        if (g.hasEnded()) break;
      }

      const snapshot = perf ? perf.snapshot() : null;
      const alive = (owner) => [...g.buildings.values()].some((b) => b.owner === owner && !b.dead);
      const winner = alive(0) && !alive(1) ? 0 : alive(1) && !alive(0) ? 1 : null;
      const count = {};
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) count[b.kind] = (count[b.kind] ?? 0) + 1;
      const workers = [...g.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind === 'worker').length;
      const enemyBlds = [...g.buildings.values()].filter((b) => b.owner === 1 && !b.dead).length;
      const enemyHp = [...g.buildings.values()]
        .filter((b) => b.owner === 1 && !b.dead)
        .map((b) => `${b.kind}:${Math.round(b.hp)}`)
        .join(',');
      const botAtk = [...g.units.values()].filter(
        (u) => u.owner === 0 && !u.dead && u.orderQueue[0]?.kind === 'attack',
      ).length;

      let debugInfo = null;
      if (wantDebug) {
        const ais = g.ais.map((ai) => ({
          player: ai.playerId,
          unreachable: ai.unreachableNodes ? ai.unreachableNodes.size : -1,
          pathBudget: ai.pathBudget,
          barracks: ai.barracksStats ?? null,
          underConstruction: [...g.buildings.values()].filter(
            (b) => b.owner === ai.playerId && !b.dead && !b.constructionComplete,
          ).length,
        }));
        const idleWorkers = [...g.units.values()]
          .filter((u) => !u.dead && u.kind === 'worker' && !u.isBusy())
          .slice(0, 6);
        const idleSamples = idleWorkers.map((w) => {
          const nodes = [...g.resourceNodes.values()]
            .filter((n) => !n.dead)
            .map((n) => ({
              resource: n.resource,
              d: Number(Math.hypot(w.pos.x - n.pos.x, w.pos.z - n.pos.z).toFixed(1)),
              approach: g.pathfinder.findApproachPath(w.pos.x, w.pos.z, n.pos.x, n.pos.z, 2.2).length > 0,
            }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 8);
          return {
            owner: w.owner,
            pos: { x: Number(w.pos.x.toFixed(1)), z: Number(w.pos.z.toFixed(1)) },
            nodes,
          };
        });
        const gatherSamples = [...g.units.values()]
          .filter((u) => !u.dead && u.kind === 'worker' && u.orderQueue[0]?.kind === 'gather')
          .slice(0, 6)
          .map((w) => {
            const order = w.orderQueue[0];
            const node = g.resourceNodes.get(order.entityId) ?? g.buildings.get(order.entityId);
            return {
              owner: w.owner,
              pos: { x: Number(w.pos.x.toFixed(1)), z: Number(w.pos.z.toFixed(1)) },
              kind: node?.kind ?? null,
              target: node ? { x: Number(node.pos.x.toFixed(1)), z: Number(node.pos.z.toFixed(1)) } : null,
              dist: node ? Number(Math.hypot(w.pos.x - node.pos.x, w.pos.z - node.pos.z).toFixed(1)) : null,
              pathLen: w.path ? w.path.length : 0,
            };
          });
        debugInfo = { ais, idleSamples, gatherSamples };
      }

      return {
        seconds: Math.round(t),
        steps,
        ended: g.hasEnded(),
        winner,
        info: `pop ${g.players[0].populationUsed}/${g.players[0].populationCap} workers ${workers} atk ${botAtk} enemyBlds ${enemyBlds} [${enemyHp}] ${JSON.stringify(count)}`,
        peak0: peak.army[0],
        peak1: peak.army[1],
        peakWorkers0: peak.workers[0],
        peakWorkers1: peak.workers[1],
        res0: g.players[0].resources.food + g.players[0].resources.wood + g.players[0].resources.silver,
        res1: g.players[1].resources.food + g.players[1].resources.wood + g.players[1].resources.silver,
        resources: {
          p0: { ...g.players[0].resources },
          p1: { ...g.players[1].resources },
        },
        first: snapshot ? snapshot.first : {},
        gathered: snapshot ? snapshot.gathered : null,
        losses: snapshot ? snapshot.losses : null,
        counters: snapshot ? snapshot.counters : null,
        labels: snapshot ? snapshot.labels : null,
        counts: snapshot ? snapshot.counts : null,
        firstByKind,
        buildingsCreated: createdBuildings.size,
        stuckMax,
        blockedWorkersMax,
        idleMax,
        timeline,
        warnings: snapshot ? snapshot.warnings : [],
        debug: debugInfo,
      };
    },
    { cap: maxSeconds, mode: player, sample: sampleSeconds, wantDebug: debug },
  );

  await context.close();
  return { seed, errors, consoleMessages, ...result };
}

const median = (values) => {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.floor(sorted.length / 2)];
};
const fmt = (value, digits = 0) => (value == null ? '-' : Number(value).toFixed(digits));

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  try {
    const rows = [];
    for (const seed of seeds) {
      process.stdout.write(`sim: seed ${seed}... `);
      const row = await run(browser, base, seed);
      rows.push(row);
      console.log(
        `${row.winner == null ? 'draw' : `P${row.winner}`} ${row.seconds}s${row.ended ? '' : ' (cap)'} · soldier ${fmt(row.first?.firstSoldier0)}s · attack ${fmt(row.first?.firstAttack0)}s`,
      );
      if (row.errors.length) console.log(`     ! page errors: ${row.errors.join(' | ')}`);
      if (player === 'scripted') console.log(`     ${row.info}`);
      if (debug && row.debug) console.log(`     debug: ${JSON.stringify(row.debug)}`);
      if (debug && row.consoleMessages.length) {
        console.log(`     console: ${row.consoleMessages.slice(0, 10).join(' | ')}`);
      }
    }

    const wins = [0, 0, 0]; // [p0, p1, undecided]
    for (const r of rows) wins[r.winner === 0 ? 0 : r.winner === 1 ? 1 : 2]++;
    const avg = Math.round(rows.reduce((s, r) => s + r.seconds, 0) / rows.length);
    const summary = {
      seeds: seeds.length,
      wins: { p0: wins[0], p1: wins[1], undecided: wins[2] },
      duration: {
        min: Math.min(...rows.map((r) => r.seconds)),
        median: median(rows.map((r) => r.seconds)),
        max: Math.max(...rows.map((r) => r.seconds)),
        average: avg,
      },
      firstSoldier0: median(rows.map((r) => r.first?.firstSoldier0)),
      firstSoldier1: median(rows.map((r) => r.first?.firstSoldier1)),
      firstAttack0: median(rows.map((r) => r.first?.firstAttack0)),
      firstAttack1: median(rows.map((r) => r.first?.firstAttack1)),
      firstBarracks: median(rows.map((r) => r.firstByKind?.barracks)),
      workersCreatedTotal: median(rows.map((r) => r.counters?.workersCreated)),
      militaryCreatedTotal: median(rows.map((r) => r.counters?.militaryCreated)),
      buildingsCreated: median(rows.map((r) => r.buildingsCreated)),
      gathered0: median(
        rows.map((r) => {
          const g = r.gathered?.p0;
          return g ? g.food + g.wood + g.silver + g.stone : null;
        }),
      ),
      unitLosses0: median(rows.map((r) => r.losses?.units?.[0])),
      unitLosses1: median(rows.map((r) => r.losses?.units?.[1])),
      pathRequests: median(rows.map((r) => r.counters?.pathRequests)),
      pathFailures: median(rows.map((r) => r.counters?.pathFailures)),
      chooseResourceNull: median(rows.map((r) => r.counters?.chooseResourceNull)),
      stuckMax: median(rows.map((r) => r.stuckMax)),
      blockedWorkersMax: median(rows.map((r) => r.blockedWorkersMax)),
      idleMax: median(rows.map((r) => r.idleMax)),
    };

    console.log(
      '\nseed | winner | seconds | ended | first soldier P0/P1 | first attack P0/P1 | workers/military total | buildings | gathered P0',
    );
    console.log(
      '-----|--------|---------|-------|---------------------|--------------------|---------------------|-----------|------------',
    );
    for (const r of rows) {
      console.log(
        [
          String(r.seed).padEnd(4),
          (r.winner ?? '—').toString().padEnd(6),
          String(r.seconds).padEnd(7),
          (r.ended ? 'yes' : 'no').padEnd(5),
          `${fmt(r.first?.firstSoldier0)}/${fmt(r.first?.firstSoldier1)}`.padEnd(19),
          `${fmt(r.first?.firstAttack0)}/${fmt(r.first?.firstAttack1)}`.padEnd(18),
          `${fmt(r.counters?.workersCreated)}/${fmt(r.counters?.militaryCreated)}`.padEnd(19),
          String(r.buildingsCreated).padEnd(9),
          fmt(
            r.gathered?.p0
              ? r.gathered.p0.food + r.gathered.p0.wood + r.gathered.p0.silver + r.gathered.p0.stone
              : null,
          ),
        ].join(' | '),
      );
    }
    console.log(
      `\nsummary (P0=${player === 'scripted' ? 'scripted-player' : difficulty} vs P1=${p1Difficulty}): P0 wins ${wins[0]}, P1 wins ${wins[1]}, undecided ${wins[2]} · avg ${avg}s`,
    );

    const out = {
      env: {
        difficulty,
        p1Difficulty,
        player,
        maxSeconds,
        sampleSeconds,
        metrics,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu: os.cpus()[0]?.model ?? 'unknown',
        commit: process.env.GIT_COMMIT ?? null,
      },
      rows,
      summary,
      date: new Date().toISOString(),
    };
    const outPath = path.resolve(outFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`wrote ${outFile}`);
  } finally {
    await browser.close();
    await close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
