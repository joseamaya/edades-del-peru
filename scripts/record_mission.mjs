#!/usr/bin/env node
/**
 * Record a campaign mission from the running game, HUD included and no cheats.
 *
 * Usage:
 *   yarn record --mission=m_tambotoco [--mode=clip|full] [--speed=1] [--seed=N  (replaces the authored map)]
 *     [--out=review/tambotoco.mp4] [--width=1280] [--height=720] [--limit=25]
 *   yarn record --mission=m_tambotoco --mode=full --speed=8 --diagnose
 *     (no video: writes a JSON with HUD warnings, stuck units, objective times and effective speed)
 *
 * `clip` records the opening (briefing, intro cards, the starting party and the mission's named
 * places) in about two minutes. `full` autoplays a mission's act shape with real move/build/attack
 * commands, no cheats, and records until victory, defeat or the time limit: `m_tambotoco` (leave the
 * cave, hunt, Huanacaure, acequia, Inticancha) and `m_junta_cusco` (cabildo, cuartel, La Apacheta,
 * Umachiri). A mission without an autopilot needs `clip`.
 *
 * The result is in-engine footage of the game itself, never a historical film. The JSON next to
 * the video lists every objective and the second it changed.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

const mission = cliArg('mission', 'm_tambotoco');
const mode = cliArg('mode', 'clip');
const speed = Number(cliArg('speed', '1'));
const seedArg = cliArg('seed', '');
const seed = seedArg === '' ? null : Number(seedArg);
const diagnose = process.argv.includes('--diagnose') || cliArg('diagnose', '0') === '1';
const width = Number(cliArg('width', '1280'));
const height = Number(cliArg('height', '720'));
const limitMinutes = Number(cliArg('limit', '25'));
const out = path.resolve(
  cliArg('out', diagnose ? `review/diagnose-${mission}-${seed ?? 'authored'}.json` : `review/${mission}-${mode}.mp4`),
);
const jsonPath = diagnose ? out.replace(/\.json$/i, '') + '.json' : out.replace(/\.mp4$/i, '.json');
const contactPath = diagnose ? '' : out.replace(/\.mp4$/i, '-contact.jpg');
// One folder per run: a shared one was wiped by every new recording, so parallel runs lost their video.
const frameDir = path.join(reviewDir(), `record-frames-${process.pid}`);

const started = Date.now();
const log = [];
const objectives = {};
let videoPath;
let diagnostics = null;

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
}

const elapsed = () => Math.round((Date.now() - started) / 1000);

/** Full-mode autopilots: each mission's act shape, driven with the player's own commands. */
const AUTOPILOTS = {
  m_tambotoco: playMission,
  m_junta_cusco: playJuntaCusco,
};

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width, height },
      ...(diagnose ? {} : { recordVideo: { dir: frameDir, size: { width, height } } }),
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
    });

    // `mapSeed` replaces the mission's authored map; without it the mission keeps its own seed.
    const seedParam = seed === null ? '' : `&mapSeed=${seed}`;
    await page.goto(`${base}/?mission=${mission}${seedParam}&fog=0&low=1&speed=${speed}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });

    const briefing = page.locator('.ed-briefing');
    await briefing.waitFor({ state: 'visible', timeout: 90_000 });
    await page.waitForTimeout(mode === 'clip' ? 6000 : 1200);
    await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
    await briefing.waitFor({ state: 'detached', timeout: 15_000 });

    await waitForPlay(page);
    const plan = await readPlan(page);
    if (diagnose) await startDiagnostics(page);
    if (mode === 'clip') await recordClip(page, plan);
    else {
      const autopilot = AUTOPILOTS[mission];
      if (!autopilot) throw new Error(`full mode has no autopilot for ${mission}; use --mode=clip`);
      await autopilot(page, plan);
    }

    await page.waitForTimeout(4000);
    const summary = await page.evaluate(() => ({
      won: window.game.mission?.won ?? null,
      ended: window.game.mission?.ended ?? false,
      objectives: window.game.mission
        ? Object.fromEntries(
            window.game.mission.def.objectives.map((o) => [o.id, window.game.mission.getObjectiveState(o.id)]),
          )
        : {},
    }));
    Object.assign(objectives, summary.objectives);
    log.push({ at: elapsed(), step: 'end', won: summary.won, ended: summary.ended });
    const raw = diagnose ? await stopDiagnostics(page) : null;
    await page.close();
    if (!diagnose) videoPath = await page.video().path();
    await context.close();
    if (diagnose) diagnostics = summarize(raw);
  } finally {
    await browser.close();
    await close();
  }

  if (!diagnose) {
    ffmpeg([
      '-i',
      videoPath,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      out,
    ]);
    try {
      ffmpeg(['-i', out, '-vf', 'fps=1/20,scale=480:-1,tile=4x3', '-frames:v', '1', contactPath]);
    } catch {
      console.warn('[record] the contact sheet was not generated (short clip?)');
    }
  }
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        mission,
        mode,
        seed: seed ?? 'authored',
        speed,
        durationSeconds: elapsed(),
        objectives,
        log,
        errors,
        ...(diagnose ? { diagnostics } : { files: { video: out, contact: contactPath } }),
      },
      null,
      2,
    )}\n`,
  );
  if (diagnose) {
    printDiagnostics(diagnostics);
    console.log(`[diagnose] ${jsonPath}`);
  } else {
    console.log(`[record] ${out} (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`[record] ${jsonPath}`);
  }
  if (errors.length) console.warn(`[record] page errors: ${errors.slice(0, 2).join(' | ')}`);
}

async function waitForPlay(page) {
  await page.waitForFunction(() => window.game?.mission?.started && !window.game.getPaused(), null, {
    timeout: 90_000,
  });
  await page.waitForFunction(() => !window.game.isCinematicActive(), null, { timeout: 90_000 });
}

/** A camera tour of the legend: the party, the huaca and the valley the mission defines. */
async function recordClip(page, plan) {
  const hold = (seconds) => page.waitForTimeout(seconds * 1000);
  // Select the party like a player: the tutorial's first step must advance on camera.
  await selectAll(page);
  await hold(4);
  await look(page, null, 42);
  await hold(9);
  if (plan.start) {
    await move(page, [await firstUnit(page, 'worker')], plan.start);
    await waitObjective(page, 'a1_salida', 'completed', 120_000, Infinity, () => look(page, null, 30, 'workers'));
  }
  if (plan.tamboQuiro) {
    // Keep the stone below the objective toasts at the top of the screen.
    await look(page, { x: plan.tamboQuiro.x + 2, z: plan.tamboQuiro.z - 5 }, 30);
    await hold(10);
  }
  if (plan.heritage) {
    await look(page, { x: plan.heritage.x, z: plan.heritage.z - 8 }, 34);
    await hold(8);
  }
  if (plan.inticancha) {
    await look(page, { x: plan.inticancha.x, z: plan.inticancha.z + 4 }, 42);
    await hold(8);
  }
  if (plan.site) {
    await look(page, plan.site, 34);
    await hold(6);
    if (mission === 'm_lima') {
      await page.evaluate(() => window.game.setSitePhase('ciudad'));
      await look(page, plan.site, 34);
      await hold(8);
    }
  }
  await look(page, null, 36);
  await hold(5);
}

/** Drive the four acts with the same commands the player issues. */
async function playMission(page, plan) {
  const deadline = started + limitMinutes * 60_000;
  if (!plan.start || !plan.heritage || !plan.heritageId || !plan.inticancha || !plan.canchas.length) {
    throw new Error('full mode autoplays the m_tambotoco act shape; use --mode=clip for another mission');
  }

  await selectAll(page);
  await look(page, null, 36, 'all');
  const worker = await firstUnit(page, 'worker');
  if (worker) await move(page, [worker], plan.start);
  await waitObjective(page, 'a1_salida', 'completed', 120_000, deadline, () => look(page, null, 32, 'workers'));
  if (await hasEnded(page)) return;

  if (plan.tamboQuiro) {
    await look(page, { x: plan.tamboQuiro.x + 2, z: plan.tamboQuiro.z - 5 }, 26);
    await page.waitForTimeout(4000);
  }
  // The party leaves the cave with nothing built: the workers raise the camp's communal store first.
  const campers = (await units(page, 'worker')).map((u) => u.id);
  await select(page, campers);
  const camp = await place(page, 'mill', { x: plan.start.x - 6, z: plan.start.z - 8 });
  if (camp) await issue(page, { kind: 'build', entityId: camp }, campers);
  await waitObjective(page, 'a1_campamento', 'completed', 180_000, deadline, () => look(page, null, 30, 'workers'));
  if (await hasEnded(page)) return;
  await gather(page);
  await waitObjective(page, 'a1_caza', 'completed', 600_000, deadline, async () => {
    await regather(page);
    await look(page, null, 31, 'workers');
  });
  if (await hasEnded(page)) return;

  const army = (await units(page)).filter((u) => u.kind !== 'worker').map((u) => u.id);
  await select(page, army);
  await move(page, army, plan.heritage, true);
  await visitWhenClose(page, plan.heritageId, plan.heritage, 15, 240_000, deadline, () => look(page, null, 30, 'army'));
  await waitObjective(page, 'a2_huanacaure', 'completed', 30_000, deadline);
  if (await hasEnded(page)) return;

  await look(page, { x: plan.heritage.x, z: plan.heritage.z + 3 }, 28);
  await page.waitForTimeout(4000);

  // The acequia is locked until the party has held Huanacaure through the alcabizas' wave.
  const gateProbe = await page.evaluate(() => {
    const g = window.game;
    const before = g.isCanalOpen();
    g.toggleCanal();
    return { before, after: g.isCanalOpen() };
  });
  if (gateProbe.before || gateProbe.after) throw new Error('the acequia opened before the hold');
  await move(page, army, { x: plan.heritage.x, z: plan.heritage.z + 12 });
  await waitObjective(page, 'a3_oleada', 'completed', 120_000, deadline, async () => {
    await look(page, null, 30, 'army');
    await move(page, army, { x: plan.heritage.x, z: plan.heritage.z + 12 });
  });
  if (await hasEnded(page)) return;

  await page.evaluate(() => window.game.toggleCanal());
  await look(page, null, 31, 'workers');
  await waitObjective(page, 'a3_acequia', 'completed', 30_000, deadline);
  if (await hasEnded(page)) return;

  const workers = (await units(page, 'worker')).map((u) => u.id);
  await select(page, workers);
  await look(page, plan.inticancha, 32);
  const mill = await place(page, 'mill', plan.inticancha);
  if (mill) await issue(page, { kind: 'build', entityId: mill }, workers);
  await waitObjective(page, 'a4_inticancha', 'completed', 240_000, deadline, () => look(page, null, 30, 'workers'));
  if (await hasEnded(page)) return;

  await look(page, { x: plan.inticancha.x + 6, z: plan.inticancha.z + 6 }, 24);
  await page.waitForTimeout(4000);
  await look(page, plan.inticancha, 32);

  for (const node of plan.canchas) {
    const house = await place(page, 'house', node);
    if (!house) continue;
    // One worker per house: re-issuing the same build order to every worker would abandon all
    // but the last foundation, and the network objective counts finished houses.
    const builder = workers.shift();
    if (builder === undefined) break;
    await issue(page, { kind: 'build', entityId: house }, [builder]);
  }
  await waitObjective(page, 'a4_canchas', 'completed', 300_000, deadline, () => look(page, plan.inticancha, 30));
  await page.waitForFunction(() => window.game.gameEnded === true, null, { timeout: 60_000 }).catch(() => {});
}

/**
 * The Junta del Cusco (m_junta_cusco): the cabildo, the cuartel, La Apacheta and Umachiri, played with
 * the orders a player issues. Pumacahua watches the camp: his death ends the mission.
 */
async function playJuntaCusco(page, plan) {
  const deadline = started + limitMinutes * 60_000;
  if (!plan.cabildo || !plan.church || !plan.apacheta || !plan.umachiri || !plan.batalla || !plan.resistir) {
    throw new Error('the Junta autopilot needs the mission objectives to resolve; the layout changed');
  }
  const column = async () =>
    (await units(page)).filter((u) => u.kind !== 'worker' && u.tag !== 'pumacahua').map((u) => u.id);

  await selectAll(page);
  await look(page, null, 36, 'all');
  await page.waitForTimeout(4000);

  // Keep the commander out of the line: `a3_pumacahua` is a required guard, not a bonus.
  const hero = (await units(page)).filter((u) => u.tag === 'pumacahua').map((u) => u.id);
  if (hero.length) await move(page, hero, { x: plan.base.x + 6, z: plan.base.z + 6 });

  // Act I — the Junta meets at the Cabildo; the church card is registered standing at the monument.
  await move(page, await column(), plan.church);
  await look(page, plan.cabildo, 28);
  await page.waitForTimeout(3000);
  await visitWhenNear(page, plan.cabildoHeritage, plan.church, 15, 150_000, deadline);
  await waitObjective(page, 'a1_cabildo', 'completed', 30_000, deadline, () => look(page, plan.cabildo, 26));
  if (await hasEnded(page)) return;

  // Act I — the five workers raise the cuartel beside the camp.
  const workers = (await units(page, 'worker')).map((u) => u.id);
  await select(page, workers);
  await look(page, null, 28, 'workers');
  const cuartel = await place(page, 'barracks', { x: plan.base.x + 8, z: plan.base.z - 6 });
  if (cuartel) await issue(page, { kind: 'build', entityId: cuartel }, workers);
  await waitObjective(page, 'a1_cuartel', 'completed', 180_000, deadline, () => look(page, null, 26, 'workers'));
  if (await hasEnded(page)) return;

  // Act II — La Apacheta: reach the pass, then hold it while the royalist vanguard arrives.
  await move(page, await column(), plan.apacheta, true);
  await look(page, null, 30, 'column');
  await waitObjective(page, 'a2_apacheta', 'completed', 240_000, deadline, () => look(page, null, 30, 'army'));
  if (await hasEnded(page)) return;
  await holdLine(page, 'a2_batalla', plan.batalla, deadline);
  if (await hasEnded(page)) return;

  // Act III — Umachiri: the last resistance buys the Junta its withdrawal.
  await move(page, await column(), plan.umachiri, true);
  await look(page, null, 30, 'column');
  await waitObjective(page, 'a3_umachiri', 'completed', 300_000, deadline, () => look(page, null, 30, 'army'));
  if (await hasEnded(page)) return;
  await holdLine(page, 'a3_resistir', plan.resistir, deadline);
  await page.waitForFunction(() => window.game.gameEnded === true, null, { timeout: 60_000 }).catch(() => {});
}

/** Keep the column inside a hold ring until its clock runs out, re-ordering the stragglers. */
async function holdLine(page, id, spec, deadline) {
  const until = Math.min(Date.now() + (spec.time + 180) * 1000, deadline);
  const radius = spec.radius ?? 8;
  const want = Math.max(1, spec.minUnits ?? 1);
  let lastOrder = 0;
  let lastLook = 0;
  while (Date.now() < until) {
    const snap = await page.evaluate(
      ({ id, point, radius }) => {
        const g = window.game;
        const m = g.mission;
        const line = [...g.units.values()].filter(
          (u) => u.owner === 0 && !u.dead && u.kind !== 'worker' && u.tag !== 'pumacahua',
        );
        const away = line.filter((u) => Math.hypot(u.pos.x - point.x, u.pos.z - point.z) > radius - 2);
        const inside = line.filter((u) => Math.hypot(u.pos.x - point.x, u.pos.z - point.z) <= radius);
        return {
          state: m.getObjectiveState(id),
          ended: !!m.ended,
          inside: inside.length,
          away: away.map((u) => u.id),
          card: !!document.querySelector('.ed-mission-card'),
        };
      },
      { id, point: spec.point, radius },
    );
    if (snap.card) {
      await page.waitForTimeout(2600);
      await page.evaluate(() => document.querySelector('.ed-mission-card')?.click());
    }
    if (snap.state === 'completed' || snap.ended) return snap.state;
    if (Date.now() - lastLook > 8000) {
      lastLook = Date.now();
      await look(page, null, 28, 'column');
    }
    if (snap.inside < want || Date.now() - lastOrder > 6000) {
      lastOrder = Date.now();
      const ids = snap.away.length ? snap.away : await columnIds(page);
      if (ids.length) await move(page, ids, spec.point, true);
    }
    await page.waitForTimeout(1000);
  }
  return null;
}

/** The units that form the moving column (the commander and the workers stay behind). */
async function columnIds(page) {
  return (await units(page)).filter((u) => u.kind !== 'worker' && u.tag !== 'pumacahua').map((u) => u.id);
}

/** Register a heritage card once a unit stands close enough for the game to accept the visit. */
async function visitWhenNear(page, heritageId, point, radius, timeoutMs, deadline) {
  const until = Math.min(Date.now() + timeoutMs, deadline);
  while (Date.now() < until) {
    const done = await page.evaluate(
      ({ heritageId, point, radius }) => {
        const g = window.game;
        if (g.isHeritageVisited(heritageId)) return true;
        const near = [...g.units.values()].some(
          (u) => u.owner === 0 && !u.dead && Math.hypot(u.pos.x - point.x, u.pos.z - point.z) <= radius,
        );
        return near && g.visitHeritage(heritageId);
      },
      { heritageId, point, radius },
    );
    if (done) return true;
    await page.waitForTimeout(600);
  }
  return false;
}

async function hasEnded(page) {
  return page.evaluate(() => window.game.mission?.ended ?? false);
}

/** In-page sampler: HUD warnings, stuck units, objectives, economy and the effective speed. */
async function startDiagnostics(page) {
  await page.evaluate(() => {
    const g = window.game;
    const diag = (window.__diag = { events: [], samples: [], startedAt: performance.now() });
    const hud = g.hud;
    const original = hud.showToast.bind(hud);
    hud.showToast = (msg, type = 'info') => {
      diag.events.push({
        wall: +((performance.now() - diag.startedAt) / 1000).toFixed(1),
        timer: +(g.mission?.timer ?? 0).toFixed(1),
        msg: String(msg),
        type,
      });
      return original(msg, type);
    };
    const snapshot = () => {
      const m = g.mission;
      const player = g.players[0];
      const units = [...g.units.values()].filter((u) => u.owner === 0 && !u.dead);
      const workers = units.filter((u) => u.kind === 'worker');
      return {
        wall: +((performance.now() - diag.startedAt) / 1000).toFixed(1),
        timer: +(m?.timer ?? 0).toFixed(1),
        fps: g.loop.getFps(),
        speed: g.loop.speed,
        objectives: m ? Object.fromEntries(m.def.objectives.map((o) => [o.id, m.getObjectiveState(o.id)])) : {},
        resources: player ? { ...player.resources } : null,
        pop: units.length,
        workers: workers.length,
        idleWorkers: workers.filter((u) => u.orderQueue.length === 0).length,
        buildings: [...g.buildings.values()].filter((b) => b.owner === 0 && !b.dead).length,
        stuck: units
          // An idle unit with no order is not stuck: blockedNotified stays set until the next order.
          .filter((u) => (u.stuckRetries ?? 0) > 0 || (u.blockedNotified && u.orderQueue.length > 0))
          .map((u) => ({
            id: u.id,
            kind: u.kind,
            tag: u.tag ?? null,
            retries: u.stuckRetries ?? 0,
            order: u.orderQueue[0]?.kind ?? null,
            x: +u.pos.x.toFixed(1),
            z: +u.pos.z.toFixed(1),
          })),
        ended: !!m?.ended,
        won: m?.won ?? null,
      };
    };
    diag.samples.push(snapshot());
    diag.timer = window.setInterval(() => diag.samples.push(snapshot()), 500);
  });
}

async function stopDiagnostics(page) {
  return page.evaluate(() => {
    const diag = window.__diag;
    if (!diag) return null;
    window.clearInterval(diag.timer);
    return { events: diag.events, samples: diag.samples };
  });
}

/** Collapse the samples into what a bug sweep needs: warnings, stalls, objective times, speed. */
function summarize(raw) {
  const events = raw?.events ?? [];
  const samples = raw?.samples ?? [];
  if (!samples.length) return { samples: 0, events: 0 };
  const last = samples[samples.length - 1];
  const toasts = new Map();
  for (const event of events) {
    const key = event.msg.replace(/\d+/g, 'N');
    const entry = toasts.get(key) ?? { text: event.msg, count: 0, first: event.timer, last: event.timer };
    entry.count++;
    entry.last = event.timer;
    toasts.set(key, entry);
  }
  const stuck = new Map();
  for (const sample of samples) {
    for (const unit of sample.stuck) {
      const key = `${unit.tag ?? unit.kind}#${unit.id}`;
      const entry = stuck.get(key) ?? {
        id: unit.id,
        kind: unit.kind,
        tag: unit.tag,
        first: sample.timer,
        last: sample.timer,
        retries: 0,
        order: unit.order,
        x: unit.x,
        z: unit.z,
      };
      entry.last = sample.timer;
      entry.retries = Math.max(entry.retries, unit.retries);
      stuck.set(key, entry);
    }
  }
  const completedAt = {};
  for (const sample of samples) {
    for (const [id, state] of Object.entries(sample.objectives)) {
      if (state === 'completed' && completedAt[id] === undefined) completedAt[id] = sample.timer;
    }
  }
  return {
    samples: samples.length,
    wallSeconds: last.wall,
    simSeconds: last.timer,
    effectiveSpeed: +(last.timer / Math.max(last.wall, 0.001)).toFixed(2),
    fps: {
      min: Math.min(...samples.map((s) => s.fps)),
      max: Math.max(...samples.map((s) => s.fps)),
    },
    objectives: last.objectives,
    completedAt,
    won: last.won,
    ended: last.ended,
    resources: last.resources,
    pop: last.pop,
    workers: last.workers,
    maxIdleWorkers: Math.max(...samples.map((s) => s.idleWorkers)),
    buildings: { end: last.buildings, min: Math.min(...samples.map((s) => s.buildings)) },
    toasts: [...toasts.values()],
    stuck: [...stuck.values()],
  };
}

function printDiagnostics(summary) {
  if (!summary?.samples) {
    console.log('[diagnose] no samples');
    return;
  }
  console.log(
    `[diagnose] sim ${summary.simSeconds}s in ${summary.wallSeconds}s wall (${summary.effectiveSpeed}x), fps ${summary.fps.min}-${summary.fps.max}`,
  );
  console.log(`[diagnose] won=${summary.won} ended=${summary.ended} objectives=${JSON.stringify(summary.objectives)}`);
  console.log(
    `[diagnose] pop ${summary.pop} workers ${summary.workers} idle ${summary.maxIdleWorkers} buildings ${summary.buildings.min}-${summary.buildings.end}`,
  );
  for (const toast of summary.toasts) {
    console.log(`[toast] ${toast.count}x ${toast.text} (sim ${toast.first}-${toast.last}s)`);
  }
  for (const unit of summary.stuck) {
    console.log(
      `[stuck] ${unit.tag ?? unit.kind}#${unit.id} order=${unit.order} retries=${unit.retries} at ${unit.x},${unit.z} (sim ${unit.first}-${unit.last}s)`,
    );
  }
}

/** World points the mission itself declares, so the recorder does not restate the map data. */
async function readPlan(page) {
  return page.evaluate(() => {
    const m = window.game.mission;
    const point = (p) => (p ? window.game.resolveMissionPoint(p) : null);
    const objective = (id) => m.def.objectives.find((o) => o.id === id);
    const memory = (tag) =>
      m.def.triggers.flatMap((t) => t.effects).find((fx) => fx.type === 'memory' && fx.tag === tag);
    const heritage = objective('a2_huanacaure');
    const inspect = objective('a1_cabildo');
    const inspectHeritage = inspect?.heritageIds?.[0] ?? null;
    const proxy = inspectHeritage
      ? window.game.siteDef?.heritageProxies?.find((entry) => entry.id === inspectHeritage)
      : null;
    const holdSpec = (id) => {
      const goal = objective(id);
      if (!goal?.pos) return null;
      return {
        point: point(goal.pos),
        radius: goal.radius ?? 8,
        minUnits: goal.minUnits ?? 1,
        time: goal.time ?? 0,
      };
    };
    return {
      start: objective('a1_salida')?.pos ? point(objective('a1_salida').pos) : null,
      heritage: heritage?.pos ? point(heritage.pos) : null,
      heritageId: heritage?.heritageIds?.[0] ?? null,
      inticancha: objective('a4_inticancha')?.pos ? point(objective('a4_inticancha').pos) : null,
      canchas: objective('a4_canchas')?.nodes?.map(point) ?? [],
      tamboQuiro: memory('ayar_cachi')?.pos ? point(memory('ayar_cachi').pos) : null,
      hualla: objective('a3_hualla')?.pos ? point(objective('a3_hualla').pos) : null,
      site: window.game.siteCenter ? { ...window.game.siteCenter } : null,
      base: window.game.playerCenter(0),
      cabildo: inspect?.pos ? point(inspect.pos) : null,
      cabildoHeritage: inspectHeritage,
      church: proxy ? { x: proxy.x, z: proxy.z } : null,
      apacheta: objective('a2_apacheta')?.pos ? point(objective('a2_apacheta').pos) : null,
      umachiri: objective('a3_umachiri')?.pos ? point(objective('a3_umachiri').pos) : null,
      batalla: holdSpec('a2_batalla'),
      resistir: holdSpec('a3_resistir'),
    };
  });
}

/** Point the camera at the party (point null) or at a place, at a readable height. */
async function look(page, point, zoom, who = 'all') {
  await page.evaluate(
    ({ point, zoom, who }) => {
      const g = window.game;
      let x = point?.x ?? 0;
      let z = point?.z ?? 0;
      if (!point) {
        const group = [];
        for (const u of g.units.values()) {
          if (u.owner !== 0 || u.dead) continue;
          if (who === 'workers' && u.kind !== 'worker') continue;
          if (who === 'army' && u.kind === 'worker') continue;
          // The Junta parks Pumacahua at the camp; averaging him with the marching column lands the
          // camera on empty grass between the two.
          if (who === 'column' && (u.kind === 'worker' || u.tag === 'pumacahua')) continue;
          group.push(u);
        }
        if (group.length) {
          // Frame the group itself: a lone straggler in empty terrain reads as a broken capture, and the
          // hunt spreads the workers across several carcasses.
          let minX = Infinity;
          let maxX = -Infinity;
          let minZ = Infinity;
          let maxZ = -Infinity;
          for (const u of group) {
            x += u.pos.x;
            z += u.pos.z;
            minX = Math.min(minX, u.pos.x);
            maxX = Math.max(maxX, u.pos.x);
            minZ = Math.min(minZ, u.pos.z);
            maxZ = Math.max(maxZ, u.pos.z);
          }
          x /= group.length;
          z /= group.length;
          const spread = Math.max(maxX - minX, maxZ - minZ);
          zoom =
            who === 'all'
              ? Math.max(zoom, Math.min(72, spread * 1.1 + 6))
              : Math.max(zoom, Math.min(40, spread * 0.9 + 14));
        } else {
          const c = g.playerCenter(0);
          x = c.x;
          z = c.z;
        }
      }
      g.camera.focusOn(x, z);
      g.camera.setHeight(zoom);
    },
    { point, zoom, who },
  );
}

async function units(page, kind = null) {
  return page.evaluate((kind) => {
    const g = window.game;
    return [...g.units.values()]
      .filter((u) => u.owner === 0 && !u.dead && (kind === null || u.kind === kind))
      .map((u) => ({ id: u.id, kind: u.kind, tag: u.tag ?? null, x: u.pos.x, z: u.pos.z }));
  }, kind);
}

async function selectAll(page) {
  await page.evaluate(() => {
    const g = window.game;
    g.selectUnits([...g.units.values()].filter((u) => u.owner === 0 && !u.dead).map((u) => u.id));
  });
}

async function select(page, ids) {
  if (!ids.length) return;
  await page.evaluate((ids) => window.game.selectUnits(ids), ids);
}

async function firstUnit(page, kind) {
  const list = await units(page, kind);
  return list[0]?.id ?? null;
}

async function move(page, ids, point, attack = false) {
  if (!ids.length) return;
  await page.evaluate(
    ({ ids, point, attack }) => {
      window.game.executeCommand(
        {
          kind: 'order',
          unitIds: ids,
          order: { kind: attack ? 'attack_move' : 'move', target: point },
          clear: true,
        },
        false,
      );
    },
    { ids, point, attack },
  );
}

async function issue(page, order, ids) {
  if (!ids.length) return;
  await page.evaluate(
    ({ ids, order }) => {
      window.game.executeCommand({ kind: 'order', unitIds: ids, order, clear: true }, false);
    },
    { ids, order },
  );
}

/** Assign every worker to a wild herd; food is the act I gate. */
async function gather(page) {
  await page.evaluate(() => {
    const g = window.game;
    const workers = [...g.units.values()].filter((u) => u.owner === 0 && u.kind === 'worker' && !u.dead);
    const hunts = [...g.resourceNodes.values()].filter((n) => n.kind === 'hunt' && !n.dead);
    workers.forEach((worker, i) => {
      const node = hunts[i % hunts.length];
      if (!node) return;
      g.executeCommand(
        { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: node.id }, clear: true },
        false,
      );
    });
  });
}

/** Send the idle workers back to the nearest live carcass: a herd runs out mid-act and stalls the gate. */
async function regather(page) {
  await page.evaluate(() => {
    const g = window.game;
    const hunts = [...g.resourceNodes.values()].filter((n) => n.kind === 'hunt' && !n.dead);
    if (hunts.length === 0) return;
    for (const worker of g.units.values()) {
      if (worker.owner !== 0 || worker.dead || worker.kind !== 'worker') continue;
      if (worker.orderQueue.length > 0 || worker.carryCountNow() > 0) continue;
      let best = hunts[0];
      let bestDist = Infinity;
      for (const node of hunts) {
        const d = Math.hypot(node.pos.x - worker.pos.x, node.pos.z - worker.pos.z);
        if (d < bestDist) {
          bestDist = d;
          best = node;
        }
      }
      g.executeCommand(
        { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: best.id }, clear: true },
        false,
      );
    }
  });
}

async function place(page, kind, point) {
  return page.evaluate(
    ({ kind, point }) => {
      const g = window.game;
      for (const [ox, oz] of [
        [0, 0],
        [4, 0],
        [-4, 0],
        [0, 4],
        [0, -4],
        [7, 7],
        [-7, -7],
      ]) {
        const placed = g.placeBuilding(kind, point.x + ox, point.z + oz);
        if (placed) return placed.id;
      }
      return null;
    },
    { kind, point },
  );
}

async function visitWhenClose(page, heritageId, point, radius, timeoutMs, deadline, onTick = null) {
  const until = Math.min(Date.now() + timeoutMs, deadline);
  let lastLook = 0;
  while (Date.now() < until) {
    if (onTick && Date.now() - lastLook > 8000) {
      lastLook = Date.now();
      await onTick();
    }
    const close = await page.evaluate(
      ({ heritageId, point, radius }) => {
        const g = window.game;
        const near = [...g.units.values()].some(
          (u) => u.owner === 0 && !u.dead && Math.hypot(u.pos.x - point.x, u.pos.z - point.z) <= radius,
        );
        if (near) g.visitHeritage(heritageId);
        return near;
      },
      { heritageId, point, radius },
    );
    if (close) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

/**
 * Wait for an objective, recording every state change and letting the player read the chapter
 * cards (the mission clock pauses while one is open, so they must be dismissed to advance).
 */
async function waitObjective(page, id, state, timeoutMs, deadline = Infinity, onTick = null) {
  const until = Math.min(Date.now() + timeoutMs, deadline);
  let current = null;
  let lastTick = 0;
  while (Date.now() < until) {
    if (onTick && Date.now() - lastTick > 8000) {
      lastTick = Date.now();
      await onTick();
    }
    const snapshot = await page.evaluate(() => {
      const g = window.game;
      const m = g.mission;
      return {
        ended: m?.ended ?? false,
        objectives: m ? Object.fromEntries(m.def.objectives.map((o) => [o.id, m.getObjectiveState(o.id)])) : {},
        card: !!document.querySelector('.ed-mission-card'),
      };
    });
    for (const [key, value] of Object.entries(snapshot.objectives)) {
      if (objectives[key] !== value) {
        objectives[key] = value;
        log.push({ at: elapsed(), objective: key, state: value });
      }
    }
    current = snapshot.objectives[id];
    if (snapshot.card) {
      await page.waitForTimeout(2600);
      await page.evaluate(() => document.querySelector('.ed-mission-card')?.click());
    }
    if (current === state || snapshot.ended) return current;
    await page.waitForTimeout(400);
  }
  return current;
}

try {
  await main();
} catch (error) {
  fs.rmSync(frameDir, { recursive: true, force: true });
  console.error('[record]', error);
  process.exitCode = 1;
}
