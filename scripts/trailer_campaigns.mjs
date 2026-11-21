#!/usr/bin/env node
/**
 * Offline cinematic capture for the saga trailer: the first mission of each campaign.
 *
 * Usage:
 *   node scripts/trailer_campaigns.mjs --format=9x16 [--dir=review/trailer-saga-9x16] [--only=m_lima]
 *   node scripts/trailer_campaigns.mjs --format=16x9 --stills=1
 *
 * Same technique as `trailer_mission.mjs`: each mission is played with ordinary orders (move,
 * attack-move, gather), the loop is stopped and every output frame advances the simulation a fixed
 * step, moves the camera and renders once. Shots are written as `<dir>/<mission>-<shot>/00000.jpg`.
 */
import fs from 'fs';
import path from 'path';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

const format = cliArg('format', '9x16');
const fps = Number(cliArg('fps', '30'));
const stillsOnly = cliArg('stills', '0') === '1';
const only = cliArg('only', '');
const dir = path.resolve(cliArg('dir', path.join(reviewDir(), `trailer-saga-${format}`)));

const vertical = format === '9x16';
const width = vertical ? 1080 : 1920;
const height = vertical ? 1920 : 1080;
/** Tall frames need the camera farther from its subject or the action leaves the sides. */
const zoomScale = vertical ? 1.35 : 1;
const Z = (v) => v * zoomScale;

let written = 0;
const started = Date.now();

// --- shot lists ------------------------------------------------------------------------------------

/** Each mission: where the camera looks (`plan` is read from the live mission) and what the army does. */
const MISSIONS = [
  {
    id: 'm1_caral',
    async direct(page, plan) {
      // Áspero's pyramid sits just north of the base.
      const huaca = off(plan.base, 0, -12);
      await film(page, 'caral-wide', 120, {
        from: off(huaca, 6, 10),
        to: off(huaca, 0, 2),
        zoomFrom: Z(62),
        zoomTo: Z(42),
        yawFrom: -0.14,
        yawTo: 0.08,
      });
      await gatherNearest(page);
      await sim(page, 6);
      await film(page, 'caral-aspero', 90, {
        from: off(plan.base, -6, 2),
        to: off(plan.base, 2, 4),
        zoomFrom: Z(34),
        zoomTo: Z(28),
        yawFrom: 0.08,
        yawTo: -0.06,
      });
      // The end card plays over a slow pull-out from the pyramid.
      await film(page, 'caral-final', 135, {
        from: off(huaca, 0, 2),
        to: off(huaca, 2, 8),
        zoomFrom: Z(40),
        zoomTo: Z(66),
        yawFrom: 0.1,
        yawTo: -0.1,
      });
    },
  },
  {
    id: 'm_tambotoco',
    async direct(page, plan) {
      await film(page, 'tambotoco-cueva', 90, {
        from: off(plan.opening, -2, 12),
        to: off(plan.opening, 0, 3),
        zoomFrom: Z(42),
        zoomTo: Z(30),
        yawFrom: 0.1,
        yawTo: -0.05,
      });
      await order(page, await ids(page, 'all'), plan.firstTarget, false);
      await sim(page, 3);
      await film(page, 'tambotoco-marcha', 90, {
        follow: 'all',
        dz: -4,
        zoomFrom: Z(34),
        zoomTo: Z(28),
        yawFrom: -0.08,
        yawTo: 0.08,
        substeps: 2,
      });
    },
  },
  {
    id: 'm_lima',
    async direct(page, plan) {
      await film(page, 'lima-ciudad', 90, {
        from: off(plan.site, 10, 6),
        to: off(plan.site, 2, 2),
        zoomFrom: Z(62),
        zoomTo: Z(46),
        yawFrom: -0.1,
        yawTo: 0.06,
      });
      await order(page, await ids(page, 'army'), plan.site, false);
      await sim(page, 4);
      await film(page, 'lima-hueste', 90, {
        follow: 'army',
        dz: -4,
        zoomFrom: Z(36),
        zoomTo: Z(30),
        yawFrom: 0.06,
        yawTo: -0.08,
        substeps: 2,
      });
    },
  },
  {
    id: 'm_junta_cusco',
    async direct(page, plan) {
      await film(page, 'junta-cusco', 90, {
        from: off(plan.site, -10, -20),
        to: off(plan.site, -3, -10),
        zoomFrom: Z(60),
        zoomTo: Z(44),
        yawFrom: 0.1,
        yawTo: -0.04,
      });
      await order(page, await ids(page, 'army'), plan.site, false);
      await sim(page, 4);
      await film(page, 'junta-columnas', 90, {
        follow: 'army',
        dz: -4,
        zoomFrom: Z(36),
        zoomTo: Z(30),
        yawFrom: -0.06,
        yawTo: 0.08,
        substeps: 2,
      });
    },
  },
  {
    id: 'm_tarapaca',
    async direct(page, plan) {
      const village = plan.firstTarget;
      await order(page, await ids(page, 'army'), village, true);
      await sim(page, 4);
      await film(page, 'tarapaca-columna', 60, {
        follow: 'army',
        dz: -4,
        zoomFrom: Z(36),
        zoomTo: Z(30),
        yawFrom: 0.05,
        yawTo: -0.05,
        substeps: 2,
      });
      // Hold the village with ordinary orders until the Chilean wave comes down the quebrada.
      for (let i = 0; i < 30; i++) {
        await order(page, await ids(page, 'army'), village, true);
        await sim(page, 4);
        if ((await page.evaluate(() => window.game.mission.getObjectiveState('a1_pueblo'))) === 'completed') break;
      }
      console.log('[trailer] a1_pueblo', await page.evaluate(() => window.game.mission.getObjectiveState('a1_pueblo')));
      // Act II: the column climbs to meet the wave on the heights, where the fight is guaranteed.
      await order(page, await ids(page, 'army'), plan.heights, true);
      const clash = await findClash(page, 120);
      console.log('[trailer] clash', JSON.stringify(clash));
      await film(page, 'tarapaca-batalla', 120, {
        follow: 'army',
        dz: -3,
        zoomFrom: Z(34),
        zoomTo: Z(27),
        yawFrom: -0.1,
        yawTo: 0.1,
        substeps: 1,
      });
    },
    stills: (plan) => [
      ['heights', plan.heights, 70],
      ['village', plan.firstTarget, 50],
    ],
  },
];

const off = (p, dx, dz) => ({ x: p.x + dx, z: p.z + dz });

// --- runtime ---------------------------------------------------------------------------------------

async function main() {
  if (!only) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  try {
    for (const mission of MISSIONS) {
      if (only && mission.id !== only) continue;
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      page.on('pageerror', (e) => console.error(`[trailer] ${mission.id} PAGEERROR`, e.message));
      await page.goto(`${base}/?mission=${mission.id}&seed=777&fog=0&cine=1&intro=0&noloop=1`, {
        waitUntil: 'networkidle',
      });
      await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
      const briefing = page.locator('.ed-briefing');
      await briefing.waitFor({ state: 'visible', timeout: 90_000 });
      await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
      await briefing.waitFor({ state: 'detached', timeout: 15_000 });
      await page.waitForFunction(() => window.game.mission.started === true, null, { timeout: 30_000 });
      await prepare(page);
      const plan = await readPlan(page);
      console.log(`[trailer] ${mission.id} plan`, JSON.stringify(plan));
      if (stillsOnly) await stills(page, mission, plan);
      else await mission.direct(page, plan);
      await context.close();
    }
  } finally {
    await browser.close();
    await close();
  }
  console.log(`[trailer] ${dir} — ${written} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

/** Freeze the match into a hand-driven renderer: virtual clock, no HUD, no adaptive quality. */
async function prepare(page) {
  await page.evaluate(() => {
    const g = window.game;
    g.loop.stop();
    g.hud.root.style.display = 'none';
    g.hud.update = () => {};
    g.hud.showToast = () => {};
    g.hud.showDialogue = () => {};
    g.hud.isMissionCardOpen = () => false;
    g.qualityGovernor.update = () => {};
    g.settings.quality = 'high';
    g.qualityGovernor.setUserQuality('high');
    g.postfx.setCinematic(true);
    g.postfx.setQuality('high');
    g.renderer.setPixelRatio(1);
    g.selectUnits([]);
    g.tutorial = null;
    g.missionRings = null;
    const rings = g.scene.getObjectByName('mission-rings');
    if (rings) rings.visible = false;
    window.__yaw0 = g.camera.yaw;
    window.__clock = 0;
    window.__t = 0;
    Object.defineProperty(performance, 'now', { configurable: true, value: () => window.__clock * 1000 });
    window.__applyCam = (cam) => {
      const c = g.camera;
      let x = cam.x;
      let z = cam.z;
      if (cam.follow) {
        const group = [...g.units.values()].filter(
          (u) => u.owner === 0 && !u.dead && (cam.follow !== 'army' || u.kind !== 'worker'),
        );
        if (group.length) {
          x = group.reduce((s, u) => s + u.pos.x, 0) / group.length + (cam.dx ?? 0);
          z = group.reduce((s, u) => s + u.pos.z, 0) / group.length + (cam.dz ?? 0);
        }
      }
      c.moveTo(x, z, true);
      c.setHeight(cam.zoom);
      c.desiredZoom = cam.zoom;
      c.zoom = cam.zoom;
      c.setYaw(window.__yaw0 + (cam.yaw ?? 0));
    };
    window.__step = (n) => {
      for (let i = 0; i < n; i++) {
        window.__clock += 1 / 60;
        window.__t += 1 / 60;
        g.update(1 / 60, window.__t);
      }
    };
  });
}

/** Mission anchors, read from the mission itself. */
async function readPlan(page) {
  return page.evaluate(() => {
    const g = window.game;
    const m = g.mission;
    const size = g.settings.mapSize;
    const L = g.missionLayout ?? {};
    const scaled = (p) => (p ? { x: p.x * size, z: p.z * size } : null);
    const first = m.def.objectives.find((o) => o.pos && !o.optional);
    const heights = m.def.objectives.find((o) => o.id === 'a2_alturas');
    return {
      base: g.playerCenter(0),
      opening: scaled(L.opening) ?? g.playerCenter(0),
      site: g.siteCenter ? { x: g.siteCenter.x, z: g.siteCenter.z } : (scaled(L.site?.focus) ?? g.playerCenter(0)),
      firstTarget: first ? g.resolveMissionPoint(first.pos) : g.playerCenter(0),
      heights: heights ? g.resolveMissionPoint(heights.pos) : null,
    };
  });
}

async function stills(page, mission, plan) {
  const spots = [
    ['base', plan.base, 40],
    ['opening', plan.opening, 40],
    ['site', plan.site, 60],
    ['target', plan.firstTarget, 45],
    ...(mission.stills?.(plan) ?? []),
  ];
  for (const [name, point, zoom] of spots) {
    if (!point) continue;
    await film(page, `${mission.id}-still-${name}-${zoom}`, 1, {
      from: point,
      to: point,
      zoomFrom: Z(zoom),
      substeps: 1,
    });
  }
}

/** A shot: `frames` output frames, each advancing `substeps` fixed steps, with an eased camera move. */
async function film(page, name, frames, shot) {
  const folder = path.join(dir, name);
  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(folder, { recursive: true });
  const from = shot.from ?? { x: 0, z: 0 };
  const to = shot.to ?? from;
  const zoomFrom = shot.zoomFrom ?? 30;
  const zoomTo = shot.zoomTo ?? zoomFrom;
  for (let i = 0; i < frames; i++) {
    const k = frames === 1 ? 1 : i / (frames - 1);
    const e = k * k * (3 - 2 * k);
    const cam = {
      x: from.x + (to.x - from.x) * e,
      z: from.z + (to.z - from.z) * e,
      zoom: zoomFrom + (zoomTo - zoomFrom) * e,
      yaw: (shot.yawFrom ?? 0) + ((shot.yawTo ?? shot.yawFrom ?? 0) - (shot.yawFrom ?? 0)) * e,
      follow: shot.follow,
      dx: shot.dx,
      dz: shot.dz,
    };
    const b64 = await page.evaluate(
      ({ cam, substeps }) => {
        window.__applyCam(cam);
        window.__step(substeps);
        const g = window.game;
        g.runtime.render();
        return g.renderer.domElement.toDataURL('image/jpeg', 0.95);
      },
      { cam, substeps: shot.substeps ?? Math.max(1, Math.round(60 / fps)) },
    );
    fs.writeFileSync(path.join(folder, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(b64.split(',')[1], 'base64'));
    written++;
  }
  console.log(`[trailer] shot ${name}: ${frames} frames`);
}

// --- the player's own commands ---------------------------------------------------------------------

async function ids(page, group) {
  return page.evaluate(
    (group) =>
      [...window.game.units.values()]
        .filter((u) => u.owner === 0 && !u.dead && (group === 'all' || u.kind !== 'worker'))
        .map((u) => u.id),
    group,
  );
}

async function order(page, unitIds, point, attack) {
  if (!unitIds.length || !point) return;
  await page.evaluate(
    ({ unitIds, point, attack }) =>
      window.game.executeCommand(
        { kind: 'order', unitIds, order: { kind: attack ? 'attack_move' : 'move', target: point }, clear: true },
        false,
      ),
    { unitIds, point, attack },
  );
}

/** Each worker gathers from the nearest live resource node. */
async function gatherNearest(page) {
  await page.evaluate(() => {
    const g = window.game;
    const nodes = [...g.resourceNodes.values()].filter((n) => !n.dead);
    for (const w of [...g.units.values()].filter((u) => u.owner === 0 && u.kind === 'worker' && !u.dead)) {
      let best = null;
      let bestD = Infinity;
      for (const n of nodes) {
        const d = Math.hypot(n.pos.x - w.pos.x, n.pos.z - w.pos.z);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
      if (best)
        g.executeCommand(
          { kind: 'order', unitIds: [w.id], order: { kind: 'gather', entityId: best.id }, clear: true },
          false,
        );
    }
  });
}

async function sim(page, seconds) {
  await page.evaluate(({ seconds }) => window.__step(Math.round(seconds * 60)), { seconds });
}

/** Advance until two hostile groups are close enough to read as a skirmish; returns its centre. */
async function findClash(page, maxSeconds) {
  for (let t = 0; t < maxSeconds; t += 2) {
    const spot = await page.evaluate(() => {
      window.__step(120);
      const g = window.game;
      const ours = [...g.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind !== 'worker');
      const foes = [...g.units.values()].filter((u) => u.owner !== 0 && !u.dead && u.kind !== 'worker');
      let best = null;
      let bestScore = 0;
      for (const foe of foes) {
        const near = ours.filter((u) => Math.hypot(u.pos.x - foe.pos.x, u.pos.z - foe.pos.z) < 16);
        if (near.length > bestScore) {
          bestScore = near.length;
          best = {
            x: near.reduce((s, u) => s + u.pos.x, foe.pos.x) / (near.length + 1),
            z: near.reduce((s, u) => s + u.pos.z, foe.pos.z) / (near.length + 1),
          };
        }
      }
      return bestScore >= 4 ? best : null;
    });
    if (spot) return spot;
  }
  console.warn('[trailer] no clash found');
  return null;
}

try {
  await main();
} catch (error) {
  console.error('[trailer]', error);
  process.exitCode = 1;
}
