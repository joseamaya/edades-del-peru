#!/usr/bin/env node
/**
 * Offline cinematic capture for a mission trailer.
 *
 * Usage:
 *   node scripts/trailer_mission.mjs --mission=m_tambotoco --format=16x9 [--fps=30] [--dir=review/trailer]
 *   node scripts/trailer_mission.mjs --mission=m_tambotoco --probe=1
 *
 * The game is played for real (move / build / gather / visit orders, no cheats) but rendered offline:
 * the loop is stopped, a virtual clock replaces `performance.now` and every output frame advances the
 * simulation a fixed step, moves the camera along a scripted path, renders once and reads the canvas.
 * That makes the footage frame-exact and smooth even when the software renderer runs at a few fps.
 *
 * Each shot is written as its own PNG sequence (`<dir>/<nn>-<name>/00000.png`) so the edit can cut to
 * the music. The HUD is hidden: this is b-roll, not a gameplay recording (`yarn record` is that).
 */
import fs from 'fs';
import path from 'path';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

const mission = cliArg('mission', 'm_tambotoco');
const format = cliArg('format', '16x9');
const fps = Number(cliArg('fps', '30'));
const probe = process.argv.includes('--probe') || cliArg('probe', '0') === '1';
const dir = path.resolve(cliArg('dir', path.join(reviewDir(), `trailer-${mission}-${format}`)));

/** Tall frames need the camera farther from its subject or the action leaves the sides. */
const VERTICAL_ZOOM = 1.35;
const vertical = format === '9x16';
const width = vertical ? 1080 : 1920;
const height = vertical ? 1920 : 1080;
const zoomScale = vertical ? VERTICAL_ZOOM : 1;

const frameDir = () => dir;
let shotIndex = 0;
let written = 0;
const started = Date.now();

async function main() {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  try {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error('[trailer] PAGEERROR', e.message));
    await page.goto(`${base}/?mission=${mission}&fog=0&cine=1&intro=0&noloop=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
    const briefing = page.locator('.ed-briefing');
    await briefing.waitFor({ state: 'visible', timeout: 90_000 });
    await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
    await briefing.waitFor({ state: 'detached', timeout: 15_000 });
    await page.waitForFunction(() => window.game.mission.started === true, null, { timeout: 30_000 });
    await prepare(page);

    const plan = await readPlan(page);
    if (cliArg('stills', '0') === '1') {
      await stills(page, plan);
      return;
    }
    if (probe) {
      const gl = await page.evaluate(() => {
        const ctx = window.game.renderer.getContext();
        const info = ctx.getExtension('WEBGL_debug_renderer_info');
        return {
          renderer: String(ctx.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : ctx.RENDERER)),
          software: window.game.usesSoftwareRenderer === true,
        };
      });
      console.log(`[trailer] probe ${width}x${height} renderer=${gl.renderer} software=${gl.software}`);
      const rings = await page.evaluate(() => {
        const g = window.game;
        const out = { selected: g.selectedUnits.length, rings: [] };
        g.scene.traverse((o) => {
          if (o.geometry?.type === 'RingGeometry') {
            const p = new o.position.constructor();
            o.getWorldPosition(p);
            const chain = [];
            let cur = o.parent;
            while (cur && chain.length < 3) {
              chain.push(cur.name || cur.type);
              cur = cur.parent;
            }
            out.rings.push({ chain, x: +p.x.toFixed(1), z: +p.z.toFixed(1), scale: +o.scale.x.toFixed(1) });
          }
        });
        out.rings = out.rings.slice(0, 6);
        return out;
      });
      console.log('[trailer] inspect', JSON.stringify(rings));
      const t0 = Date.now();
      await film(page, 'probe', 12, { substeps: 2, from: plan.cave, to: plan.cave, zoomFrom: 26, zoomTo: 26 });
      console.log(`[trailer] probe ${((Date.now() - t0) / 12).toFixed(0)} ms/frame`);
      return;
    }
    await direct(page, plan);
  } finally {
    await browser.close();
    await close();
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`[trailer] ${dir} — ${shotIndex} shots, ${written} frames in ${seconds}s`);
}

/** Freeze the match into a hand-driven renderer: virtual clock, no HUD, no adaptive quality. */
async function prepare(page) {
  await page.evaluate(() => {
    const g = window.game;
    g.loop.stop();
    // The HUD is off camera; its per-frame DOM work would only slow the capture down.
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
    // No selection: the rings would read as untouched UI in every frame.
    g.selectUnits([]);
    // Onboarding rings and the tutorial's highlights are gameplay UI, not trailer footage.
    g.tutorial = null;
    g.missionRings = null;
    const rings = g.scene.getObjectByName('mission-rings');
    if (rings) rings.visible = false;
    // The Ayar's gold rings and banners are in-game identity UI; a trailer frame reads cleaner without them.
    // The Ayar's gold rings stay: they are the game's identity markers for the eight siblings.
    // Channel cards and act banners must not hold the mission clock while we step it by hand.
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
          let sx = 0;
          let sz = 0;
          for (const u of group) {
            sx += u.pos.x;
            sz += u.pos.z;
          }
          x = sx / group.length + (cam.dx ?? 0);
          z = sz / group.length + (cam.dz ?? 0);
        }
      }
      c.moveTo(x, z, true);
      c.desiredZoom = cam.zoom;
      c.zoom = cam.zoom;
      c.setHeight(cam.zoom);
      c.desiredZoom = cam.zoom;
      c.zoom = cam.zoom;
      if (typeof cam.yaw === 'number') c.setYaw(cam.yaw);
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

/** Boot state the director needs, read from the mission itself. */
async function readPlan(page) {
  return page.evaluate(() => {
    const g = window.game;
    const m = g.mission;
    const point = (p) => (p ? g.resolveMissionPoint(p) : null);
    const objective = (id) => m.def.objectives.find((o) => o.id === id);
    const memory = (tag) =>
      m.def.triggers.flatMap((t) => t.effects).find((fx) => fx.type === 'memory' && fx.tag === tag);
    const heritage = objective('a2_huanacaure');
    const cave = g.missionLayout?.opening
      ? { x: g.missionLayout.opening.x * g.settings.mapSize, z: g.missionLayout.opening.z * g.settings.mapSize }
      : g.playerCenter(0);
    return {
      cave,
      base: g.playerCenter(0),
      start: objective('a1_salida')?.pos ? point(objective('a1_salida').pos) : g.playerCenter(0),
      tamboQuiro: memory('ayar_cachi')?.pos ? point(memory('ayar_cachi').pos) : null,
      heritage: heritage?.pos ? point(heritage.pos) : null,
      heritageId: heritage?.heritageIds?.[0] ?? null,
      inticancha: objective('a4_inticancha')?.pos ? point(objective('a4_inticancha').pos) : null,
      canchas: objective('a4_canchas')?.nodes?.map(point) ?? [],
      hold: objective('a3_oleada')?.pos ? point(objective('a3_oleada').pos) : null,
      canal: g.canalSite ? { ...g.canalSite } : null,
      site: g.siteCenter ? { ...g.siteCenter } : null,
    };
  });
}

/** One frame per candidate framing, for calibrating the shot list without a full capture. */
async function stills(page, plan) {
  const z = (v) => v * zoomScale;
  const spots = [
    ['cueva', plan.cave, 30],
    ['cueva', plan.cave, 44],
    ['huanacaure', plan.heritage, 40],
    ['huanacaure', plan.heritage, 52],
    ['huanacaure', plan.heritage, 64],
    ['inticancha', plan.inticancha, 40],
    ['inticancha', plan.inticancha, 55],
    ['cancha', plan.canchas[0], 52],
    ['canal', plan.canal, 46],
    ['valle', plan.site ?? plan.start, 60],
  ];
  let i = 0;
  for (const [name, point, zoom] of spots) {
    if (!point) continue;
    await film(page, `still-${String(i).padStart(2, '0')}-${name}-${zoom}`, 1, {
      from: point,
      to: point,
      zoomFrom: z(zoom),
      zoomTo: z(zoom),
      substeps: 1,
    });
    i++;
  }
}

/** A shot: `frames` output frames, each advancing `substeps` fixed steps. */
async function film(page, name, frames, shot) {
  const folder = path.join(frameDir(), `${String(shotIndex).padStart(2, '0')}-${name}`);
  fs.mkdirSync(folder, { recursive: true });
  shotIndex++;
  for (let i = 0; i < frames; i++) {
    const k = frames === 1 ? 1 : i / (frames - 1);
    const e = k * k * (3 - 2 * k);
    const cam = {
      x: shot.from.x + (shot.to.x - shot.from.x) * e,
      z: shot.from.z + (shot.to.z - shot.from.z) * e,
      zoom: (shot.zoomFrom ?? 30) + ((shot.zoomTo ?? shot.zoomFrom ?? 30) - (shot.zoomFrom ?? 30)) * e,
      yaw: shot.yaw,
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

// --- driving the match with the player's own commands -------------------------------------------

async function units(page, kind = null) {
  return page.evaluate((kind) => {
    const g = window.game;
    return [...g.units.values()]
      .filter((u) => u.owner === 0 && !u.dead && (kind === null || u.kind === kind))
      .map((u) => ({ id: u.id, kind: u.kind, tag: u.tag ?? null, x: u.pos.x, z: u.pos.z }));
  }, kind);
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
    ({ ids, order }) => window.game.executeCommand({ kind: 'order', unitIds: ids, order, clear: true }, false),
    { ids, order },
  );
}

async function place(page, kind, point, maxRadius = 14) {
  return page.evaluate(
    ({ kind, point, maxRadius }) => {
      const g = window.game;
      // The authored site keeps a keep-out around its plaza, so a fixed offset list can miss it.
      for (const radius of [0, 4, 8, 12, 14].filter((r) => r <= maxRadius)) {
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + radius * 0.27;
          const placed = g.placeBuilding(kind, point.x + Math.cos(angle) * radius, point.z + Math.sin(angle) * radius);
          if (placed) return placed.id;
        }
      }
      return null;
    },
    { kind, point, maxRadius },
  );
}

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

/** Advance until a player building near `point` is really going up (or finished). */
async function simUntilProgress(page, point, ratio, maxSeconds) {
  for (let t = 0; t < maxSeconds; t += 1) {
    const progress = await page.evaluate(
      ({ point }) => {
        window.__step(60);
        const g = window.game;
        let best = 0;
        for (const b of g.buildings.values()) {
          if (b.owner !== 0 || b.dead) continue;
          if (Math.hypot(b.pos.x - point.x, b.pos.z - point.z) > 16) continue;
          best = Math.max(best, b.constructionComplete ? 1 : b.constructionProgress);
        }
        return best;
      },
      { point },
    );
    if (progress >= ratio) return true;
  }
  return false;
}

/** Fast-forward in one-second chunks until an objective completes (or the clock runs out). */
async function simUntil(page, id, maxSeconds) {
  for (let t = 0; t < maxSeconds; t += 1) {
    const done = await page.evaluate(
      ({ id }) => {
        window.__step(60);
        return window.game.mission.getObjectiveState(id);
      },
      { id },
    );
    if (done === 'completed') return true;
  }
  console.warn(`[trailer] objective ${id} did not complete in ${maxSeconds}s`);
  return false;
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
      const ours = [...g.units.values()].filter((u) => u.owner === 0 && !u.dead);
      const foes = [...g.units.values()].filter((u) => u.owner !== 0 && !u.dead);
      let best = null;
      let bestScore = 0;
      for (const foe of foes) {
        const near = ours.filter((u) => Math.hypot(u.pos.x - foe.pos.x, u.pos.z - foe.pos.z) < 14);
        if (near.length === 0) continue;
        const x = near.reduce((sum, u) => sum + u.pos.x, foe.pos.x) / (near.length + 1);
        const z = near.reduce((sum, u) => sum + u.pos.z, foe.pos.z) / (near.length + 1);
        const score = near.length;
        if (score > bestScore) {
          bestScore = score;
          best = { x, z };
        }
      }
      return bestScore >= 3 ? best : null;
    });
    if (spot) return spot;
  }
  return null;
}

/** Keep the fighters inside a hold ring: chase a fight, but never leave the objective. */
async function holdRing(page, point, maxSeconds) {
  for (let t = 0; t < maxSeconds; t += 5) {
    const ids = (await units(page)).filter((u) => u.kind !== 'worker').map((u) => u.id);
    await move(page, ids, point, true);
    await sim(page, 5);
  }
}

/** Walk the party onto a point and register the heritage card when the game accepts the visit. */
async function visit(page, heritageId, point, radius) {
  for (let t = 0; t < 240; t += 1) {
    const ok = await page.evaluate(
      ({ heritageId, point, radius }) => {
        const g = window.game;
        window.__step(60);
        if (g.isHeritageVisited(heritageId)) return true;
        const near = [...g.units.values()].some(
          (u) => u.owner === 0 && !u.dead && Math.hypot(u.pos.x - point.x, u.pos.z - point.z) <= radius,
        );
        return near && g.visitHeritage(heritageId);
      },
      { heritageId, point, radius },
    );
    if (ok) return true;
  }
  return false;
}

// --- the trailer's shot list --------------------------------------------------------------------

async function direct(page, plan) {
  const z = (v) => v * zoomScale;
  const { cave, start, heritage, inticancha, canal } = plan;
  const workers = async () => (await units(page, 'worker')).map((u) => u.id);
  const army = async () => (await units(page)).filter((u) => u.kind !== 'worker').map((u) => u.id);

  if (!start || !heritage || !inticancha) throw new Error('the mission points did not resolve');

  // 1. The cave at dawn: the party where the legend starts.
  await film(page, 'cueva', 135, {
    from: { x: cave.x - 2, z: cave.z + 10 },
    to: { x: cave.x, z: cave.z + 2 },
    zoomFrom: z(40),
    zoomTo: z(30),
    substeps: 2,
  });

  // 2. Out of Tambotoco: the march framed on the fighters (the workers bring up the rear).
  await move(
    page,
    (await units(page)).map((u) => u.id),
    start,
  );
  await sim(page, 2);
  await film(page, 'salida', 120, {
    from: { x: 0, z: 0 },
    to: { x: 0, z: 0 },
    follow: 'army',
    dz: -4,
    zoomFrom: z(34),
    zoomTo: z(28),
    substeps: 2,
  });
  await simUntil(page, 'a1_salida', 60);

  // 3. The first camp: the workers raise the communal store while we capture the build.
  const crew = await workers();
  const camp = await place(page, 'mill', { x: start.x - 6, z: start.z - 8 });
  if (camp) await issue(page, { kind: 'build', entityId: camp }, crew);
  await sim(page, 4);
  await film(page, 'campamento', 90, {
    from: { x: start.x - 10, z: start.z - 14 },
    to: { x: start.x - 4, z: start.z - 6 },
    zoomFrom: z(38),
    zoomTo: z(30),
    substeps: 1,
  });
  await simUntil(page, 'a1_campamento', 180);

  // 4. The hunt fills the store; then the column marches on the huaca.
  await gather(page);
  await simUntil(page, 'a1_caza', 600);
  await move(page, await army(), heritage, true);
  await sim(page, 2);
  await film(page, 'marcha', 90, {
    from: { x: 0, z: 0 },
    to: { x: 0, z: 0 },
    follow: 'army',
    dz: -6,
    zoomFrom: z(40),
    zoomTo: z(32),
    substeps: 2,
  });

  // 5. Huanacaure: Ayar Uchu turns to stone.
  await visit(page, plan.heritageId, heritage, 15);
  await film(page, 'huanacaure', 120, {
    from: { x: heritage.x + 10, z: heritage.z - 18 },
    to: { x: heritage.x + 4, z: heritage.z - 10 },
    zoomFrom: z(58),
    zoomTo: z(44),
    substeps: 1,
  });
  await simUntil(page, 'a2_huanacaure', 60);

  // 6. Act III: the valley's ayllus attack the ring below the huaca, and the column holds it.
  if (plan.hold) {
    await move(page, await army(), plan.hold, true);
    await sim(page, 10);
    const clash = (await findClash(page, 20)) ?? plan.hold;
    await film(page, 'batalla', 90, {
      from: { x: clash.x + 5, z: clash.z - 10 },
      to: { x: clash.x, z: clash.z - 4 },
      zoomFrom: z(40),
      zoomTo: z(32),
      substeps: 1,
    });
    await holdRing(page, plan.hold, 120);
    await simUntil(page, 'a3_oleada', 60);
  }

  // 7. The canal gate opens: the crew walks to the intake and the water reaches the valley.
  if (canal) {
    await move(page, await army(), canal, true);
    await sim(page, 30);
    for (let i = 0; i < 30; i++) {
      const open = await page.evaluate(() => {
        const g = window.game;
        if (!g.isCanalOpen()) g.toggleCanal();
        return g.isCanalOpen();
      });
      if (open) break;
      await sim(page, 2);
    }
    await sim(page, 2);
    await film(page, 'acequia', 90, {
      from: { x: canal.x - 12, z: canal.z - 16 },
      to: { x: canal.x - 5, z: canal.z - 8 },
      zoomFrom: z(50),
      zoomTo: z(38),
      substeps: 1,
    });
  }
  await simUntil(page, 'a3_acequia', 120);

  // 8. Inticancha rises: the crew walks in, then the plaza goes up on camera.
  const builders = await workers();
  const plaza = await place(page, 'mill', inticancha);
  if (plaza) await issue(page, { kind: 'build', entityId: plaza }, builders);
  await simUntilProgress(page, inticancha, 0.45, 300);
  await film(page, 'inticancha', 105, {
    from: { x: inticancha.x + 12, z: inticancha.z - 18 },
    to: { x: inticancha.x + 5, z: inticancha.z - 9 },
    zoomFrom: z(56),
    zoomTo: z(42),
    substeps: 1,
  });
  await simUntil(page, 'a4_inticancha', 600);

  // 9. The four canchas close the site.
  for (const node of plan.canchas.slice(0, 4)) {
    const house = await place(page, 'house', node, 5);
    if (!house) continue;
    const builder = (await workers())[0];
    if (builder === undefined) break;
    await issue(page, { kind: 'build', entityId: house }, [builder]);
  }
  await simUntilProgress(page, inticancha, 0.4, 300);
  await film(page, 'canchas', 105, {
    from: { x: inticancha.x + 16, z: inticancha.z + 12 },
    to: { x: inticancha.x + 8, z: inticancha.z + 5 },
    zoomFrom: z(58),
    zoomTo: z(46),
    substeps: 1,
  });
  await simUntil(page, 'a4_canchas', 600);

  // 10. The founding: a rising wide shot over Inticancha.
  await film(page, 'climax', 150, {
    from: { x: inticancha.x + 8, z: inticancha.z - 22 },
    to: { x: inticancha.x + 3, z: inticancha.z - 10 },
    zoomFrom: z(70),
    zoomTo: z(50),
    substeps: 1,
  });
}

try {
  await main();
} catch (error) {
  console.error('[trailer]', error);
  process.exitCode = 1;
}
