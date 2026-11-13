#!/usr/bin/env node
/**
 * Record a campaign mission from the running game, HUD included and no cheats.
 *
 * Usage:
 *   yarn record --mission=m_tambotoco [--mode=clip|full] [--speed=1]
 *     [--out=review/tambotoco.mp4] [--width=1280] [--height=720] [--limit=25]
 *
 * `clip` records the opening (briefing, intro cards, the Ayar at the cave, Tambo Quiro, Huanacaure
 * and the valley) in about two minutes. `full` plays the whole mission with real move/gather/build
 * commands and records until victory, defeat or the time limit.
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
const width = Number(cliArg('width', '1280'));
const height = Number(cliArg('height', '720'));
const limitMinutes = Number(cliArg('limit', '25'));
const out = path.resolve(cliArg('out', `review/${mission}-${mode}.mp4`));
const jsonPath = out.replace(/\.mp4$/i, '.json');
const contactPath = out.replace(/\.mp4$/i, '-contact.jpg');
const frameDir = path.join(reviewDir(), 'record-frames');

const START_POINT = { x: 60, z: 92 };
const TAMBO_QUIRO = { x: 70, z: 91 };
const HUANACAURE = { x: 120, z: 106 };
const INTICANCHA = { x: 168, z: 190 };

const started = Date.now();
const log = [];
const objectives = {};

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
}

const elapsed = () => Math.round((Date.now() - started) / 1000);

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const errors = [];
  let videoPath;
  try {
    const context = await browser.newContext({
      viewport: { width, height },
      recordVideo: { dir: frameDir, size: { width, height } },
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
    });

    await page.goto(`${base}/?mission=${mission}&seed=777&fog=0&low=1&speed=${speed}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });

    const briefing = page.locator('.ed-briefing');
    await briefing.waitFor({ state: 'visible', timeout: 90_000 });
    await page.waitForTimeout(mode === 'clip' ? 6000 : 1200);
    await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
    await briefing.waitFor({ state: 'detached', timeout: 15_000 });

    await waitForPlay(page);
    if (mode === 'clip') await recordClip(page);
    else await playMission(page);

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
    await page.close();
    videoPath = await page.video().path();
    await context.close();
  } finally {
    await browser.close();
    await close();
  }

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
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        mission,
        mode,
        seed: 777,
        speed,
        durationSeconds: elapsed(),
        objectives,
        log,
        errors,
        files: { video: out, contact: contactPath },
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[record] ${out} (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`[record] ${jsonPath}`);
  if (errors.length) console.warn(`[record] page errors: ${errors.slice(0, 2).join(' | ')}`);
}

async function waitForPlay(page) {
  await page.waitForFunction(() => window.game?.mission?.started && !window.game.getPaused(), null, {
    timeout: 90_000,
  });
  await page.waitForFunction(() => !window.game.isCinematicActive(), null, { timeout: 90_000 });
}

/** A camera tour of the legend: the party, Tambo Quiro, Huanacaure and the valley. */
async function recordClip(page) {
  const hold = (seconds) => page.waitForTimeout(seconds * 1000);
  await hold(4);
  await look(page, null, 42);
  await hold(9);
  await move(page, [await firstUnit(page, 'worker')], START_POINT);
  await waitObjective(page, 'a1_salida', 'completed', 120_000);
  // Keep the stone below the objective toasts at the top of the screen.
  await look(page, { x: TAMBO_QUIRO.x + 2, z: TAMBO_QUIRO.z - 5 }, 30);
  await hold(10);
  await look(page, { x: HUANACAURE.x, z: HUANACAURE.z + 4 }, 42);
  await hold(8);
  await look(page, { x: INTICANCHA.x, z: INTICANCHA.z + 4 }, 42);
  await hold(8);
  await look(page, null, 36);
  await hold(5);
}

/** Drive the four acts with the same commands the player issues. */
async function playMission(page) {
  const deadline = started + limitMinutes * 60_000;

  const worker = await firstUnit(page, 'worker');
  if (worker) await move(page, [worker], START_POINT);
  await waitObjective(page, 'a1_salida', 'completed', 120_000, deadline);
  if (await hasEnded(page)) return;

  await gather(page);
  await waitObjective(page, 'a1_caza', 'completed', 420_000, deadline);
  if (await hasEnded(page)) return;

  const army = (await units(page)).filter((u) => u.kind !== 'worker').map((u) => u.id);
  await move(page, army, HUANACAURE, true);
  await visitWhenClose(page, 'tambotoco_huanacaure', HUANACAURE, 15, 240_000, deadline);
  await waitObjective(page, 'a2_huanacaure', 'completed', 30_000, deadline);
  if (await hasEnded(page)) return;

  await page.evaluate(() => window.game.toggleCanal());
  await waitObjective(page, 'a3_acequia', 'completed', 30_000, deadline);
  if (await hasEnded(page)) return;

  const workers = (await units(page, 'worker')).map((u) => u.id);
  const mill = await place(page, 'mill', INTICANCHA);
  if (mill) await issue(page, { kind: 'build', entityId: mill }, workers);
  await waitObjective(page, 'a4_inticancha', 'completed', 240_000, deadline);
  if (await hasEnded(page)) return;

  const nodes = [
    { x: INTICANCHA.x - 12, z: INTICANCHA.z },
    { x: INTICANCHA.x + 12, z: INTICANCHA.z },
    { x: INTICANCHA.x, z: INTICANCHA.z - 12 },
    { x: INTICANCHA.x, z: INTICANCHA.z + 12 },
  ];
  for (const node of nodes) {
    const house = await place(page, 'house', node);
    if (house) await issue(page, { kind: 'build', entityId: house }, workers);
  }
  await waitObjective(page, 'a4_canchas', 'completed', 300_000, deadline);
  await page.waitForFunction(() => window.game.gameEnded === true, null, { timeout: 60_000 }).catch(() => {});
}

async function hasEnded(page) {
  return page.evaluate(() => window.game.mission?.ended ?? false);
}

/** Point the camera at the party (point null) or at a place, at a readable height. */
async function look(page, point, zoom) {
  await page.evaluate(
    ({ point, zoom }) => {
      const g = window.game;
      let x = point?.x ?? 0;
      let z = point?.z ?? 0;
      if (!point) {
        let n = 0;
        for (const u of g.units.values()) {
          if (u.owner !== 0 || u.dead) continue;
          x += u.pos.x;
          z += u.pos.z;
          n++;
        }
        if (n) {
          x /= n;
          z /= n;
        } else {
          const c = g.playerCenter(0);
          x = c.x;
          z = c.z;
        }
      }
      g.camera.focusOn(x, z);
      g.camera.setHeight(zoom);
    },
    { point, zoom },
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

async function visitWhenClose(page, heritageId, point, radius, timeoutMs, deadline) {
  const until = Math.min(Date.now() + timeoutMs, deadline);
  while (Date.now() < until) {
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
async function waitObjective(page, id, state, timeoutMs, deadline = Infinity) {
  const until = Math.min(Date.now() + timeoutMs, deadline);
  let current = null;
  while (Date.now() < until) {
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
  console.error('[record]', error);
  process.exitCode = 1;
}
