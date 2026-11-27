#!/usr/bin/env node
/**
 * Offline capture for the 60 s trailer (`scripts/trailer60.json`): one signature moment per shot instead of
 * one template. Each shot stages its own units, light, fires and site phases, and drives its own camera.
 * Gameplay shots (`hud: true`) keep the HUD and are captured from the page, not the canvas.
 *
 * Usage: node scripts/trailer60.mjs --format=16x9|9x16 [--gpu] [--only=caral,junin] [--dir=…] [--preview=4]
 * Frames go to review/trailer60-<format>/<shot>/00000.jpg (30 fps).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchChromium, withViteServer, cliArg, reviewDir } from './lib.mjs';

const PLAN = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'trailer60.json'), 'utf8'),
);
const format = cliArg('format', '16x9');
const only = cliArg('only', '');
const vertical = format === '9x16';
const width = vertical ? 1080 : 1920;
const height = vertical ? 1920 : 1080;
const dir = path.resolve(cliArg('dir', path.join(reviewDir(), `trailer60-${format}`)));
// `--preview=4` films only that many frames per shot (staging checks).
const preview = Number(cliArg('preview', '0'));

/**
 * Shot staging. Coordinates are world metres on the 256 m map; camera `y` is height above the terrain under
 * that point. `eye`/`look` are [start, end] and ease between them; `v` overrides them for tall frames.
 * `rows`: unit blocks (`order` move | attack_move | hold) whose members keep their slot on the way.
 * `hero`: a named unit placed at `at` and sent to `to`. `fires`: [x, z, height] burning points.
 * `phases`: [k, phase] site phases switched during the shot (k = 0..1 of the shot).
 * `rts`: the game's own camera (gameplay shots), from `at` to `to` at `height`.
 */
const SHOTS = {
  caral: {
    mission: 'm1_caral',
    time: 0.7,
    hud: true,
    warmup: 0.6,
    rows: [{ kind: 'worker', owner: 0, count: 16, at: [150, 72], to: [158, 44], order: 'move', select: true }],
    phases: [
      [0, 'foundation'],
      [0.3, 'fill'],
      [0.55, 'finished'],
      [0.8, 'in_use'],
    ],
    rts: { at: [164, 58], to: [164, 48], height: [60, 48] },
  },
  chavin: {
    mission: 'm2_chavin',
    time: 0.5,
    warmup: 1.0,
    rows: [{ kind: 'worker', owner: 0, count: 18, at: [150, 148], to: [133, 135], order: 'move' }],
    // A still lens: a camera that keeps pace with the procession hides its walk.
    eye: [
      [161, 3, 159],
      [161, 3, 159],
    ],
    look: [
      [128, 6, 126],
      [129, 5, 127],
    ],
    fov: 40,
  },
  moche: {
    mission: 'm3_moche_recuay',
    time: 0.5,
    warmup: 2.6,
    rows: [
      { kind: 'soldier', owner: 0, count: 14, at: [154, 114], to: [174, 102], order: 'attack_move' },
      { kind: 'musketeer', owner: 0, count: 4, at: [150, 117], to: [174, 102], order: 'attack_move' },
      { kind: 'soldier', owner: 1, count: 14, at: [174, 102], to: [154, 114], order: 'attack_move' },
    ],
    eye: [
      [178, 9, 127],
      [172, 7, 122],
    ],
    look: [
      [162, 1, 109],
      [163, 3, 101],
    ],
    fov: 42,
  },
  yahuar: {
    mission: 'm5_yahuar_pampa',
    time: 0.36,
    warmup: 1.4,
    hero: { tag: 'cusi_yupanqui', at: [150, 100], to: [166, 98], order: 'attack_move' },
    rows: [
      { kind: 'inca_warrior', owner: 0, count: 16, at: [146, 100], to: [166, 98], order: 'attack_move' },
      { kind: 'chanca_warrior', owner: 1, count: 16, at: [166, 97], to: [146, 100], order: 'attack_move' },
    ],
    clearLens: true,
    eye: [
      [138, 3.5, 101],
      [144, 3.2, 100],
    ],
    look: [
      [162, 2, 98],
      [164, 3.5, 97],
    ],
    fov: 42,
  },
  chanchan: {
    mission: 'm6_chimu_inca',
    time: 0.36,
    warmup: 0.4,
    hero: { tag: 'tupac_yupanqui', at: [154, 90], to: [178, 89], order: 'move' },
    rows: [
      { kind: 'inca_warrior', owner: 0, count: 20, at: [150, 90], to: [176, 89], order: 'move' },
      { kind: 'inca_slinger', owner: 0, count: 8, at: [144, 91], to: [170, 90], order: 'move' },
      { kind: 'chimu_fixi', owner: 1, count: 8, at: [190, 87], to: [190, 87], order: 'hold' },
    ],
    // Behind the army, looking east at the citadel (the site sits at 190, 87): the walls rise ahead of it.
    clearLens: true,
    eye: [
      [140, 4, 98],
      [145, 7, 99],
    ],
    look: [
      [168, 1, 90],
      [184, 1, 88],
    ],
    fov: 44,
  },
  cusco_llamas: {
    mission: 'm_cusco_1536',
    // Afternoon light under the night grade: at 0.08 the plaza floor went black, and at 0.22 the street
    // fell into the roofs' shadow.
    time: 0.34,
    warmup: 0.8,
    hero: { tag: 'manco_inca', at: [158, 182], to: [180, 182], order: 'move' },
    rows: [{ kind: 'inca_warrior', owner: 0, count: 16, at: [154, 182], to: [176, 182], order: 'move' }],
    // Three flames along each ridge: one point per roof read as a campfire.
    fires: [
      [151, 168, 4.2],
      [151, 170, 4.2],
      [151, 172, 4.2],
      // This roof's ridge runs east-west.
      [179, 171, 4.2],
      [181, 171, 4.2],
      [183, 171, 4.2],
      [154, 186, 4.2],
      [156, 186, 4.2],
      [158, 186, 4.2],
      [172, 186, 4.2],
      [174, 186, 4.2],
      [176, 186, 4.2],
      [178, 186, 4.2],
      [180, 186, 4.2],
      [182, 186, 4.2],
      [184, 186, 4.2],
      // The near roof on the right of the street.
      [178, 175, 4.2],
      [180, 175, 4.2],
      [182, 175, 4.2],
      [184, 175, 4.2],
      [160, 162, 5.4],
      [163, 162, 5.4],
      [166, 162, 5.4],
      [169, 162, 5.4],
      [172, 162, 5.4],
    ],
    // Down the burning street: the warriors march toward the lens between the roofs.
    eye: [
      [192, 4, 180],
      [189, 4.5, 180],
    ],
    look: [
      [160, 2, 181],
      [162, 3, 180],
    ],
    fov: 46,
  },
  tupac: {
    mission: 'm7_tupac_amaru',
    time: 0.3,
    warmup: 0.6,
    hero: { tag: 'tupac_amaru', at: [187, 104], to: [187, 90], order: 'move' },
    rows: [
      { kind: 'soldier', owner: 0, count: 14, at: [187, 108], to: [187, 90], order: 'move' },
      { kind: 'worker', owner: 0, count: 14, at: [187, 113], to: [187, 95], order: 'move' },
    ],
    eye: [
      [187, 1.9, 99],
      [187, 2.3, 93],
    ],
    look: [
      [187, 1.6, 110],
      [187, 1.8, 104],
    ],
    fov: 42,
  },
  junin: {
    mission: 'm8_independencia',
    time: 0.64,
    warmup: 0.6,
    hero: { tag: 'sucre', at: [121, 166.5], to: [152, 151], order: 'attack_move' },
    rows: [
      { kind: 'hussar', owner: 0, count: 12, at: [118, 168], to: [152, 151], order: 'attack_move' },
      { kind: 'realista_dragon', owner: 1, count: 12, at: [152, 151], to: [118, 168], order: 'attack_move' },
    ],
    eye: [
      [129, 1.8, 148.5],
      [132.5, 1.9, 147.5],
    ],
    look: [
      [122, 1.4, 165],
      [135, 1.4, 159.5],
    ],
    fov: 42,
  },
  real_felipe: {
    mission: 'm_real_felipe',
    time: 0.3,
    warmup: 3.5,
    rows: [
      { kind: 'artillery', owner: 1, count: 3, at: [176, 101], to: [150, 100], order: 'hold' },
      { kind: 'mortar', owner: 1, count: 2, at: [183, 92], to: [150, 100], order: 'hold' },
      { kind: 'soldier', owner: 0, count: 14, at: [155, 100], to: [165, 99], order: 'attack_move', immortal: true },
    ],
    eye: [
      [178, 6, 103],
      [196, 22, 122],
    ],
    look: [
      [150, 1, 99],
      [172, 1, 96],
    ],
    fov: 44,
  },
  arica: {
    mission: 'm9_guerra_pacifico',
    time: 0.3,
    warmup: 0.4,
    hero: { tag: 'bolognesi', at: [173, 88], to: [173, 88], order: 'hold', face: [160, 92] },
    // The defenders stand behind him, so the hero is the only figure in the foreground.
    rows: [{ kind: 'republica_defensor', owner: 0, count: 8, at: [178, 91], to: [178, 91], order: 'hold' }],
    eye: [
      [176, 1.9, 85],
      [187, 7, 80],
    ],
    look: [
      [166, 1.8, 92],
      [162, 1, 95],
    ],
    fov: 42,
  },
  brena: {
    mission: 'm_brena',
    time: 0.72,
    warmup: 0.8,
    follow: { tag: 'caceres', at: [54, 128], to: [80, 124] },
  },
  g_construye: {
    mission: 'm_lima',
    time: 0.6,
    hud: true,
    warmup: 0.4,
    phases: [[0, 'ciudad']],
    rows: [{ kind: 'worker', owner: 0, count: 8, at: [86, 190], to: [86, 190], order: 'hold', select: true }],
    // Placed through the game's own command and raised by the selected workers during the shot.
    build: [
      { kind: 'barracks', at: [80, 182], from: 0.15, to: 1 },
      { kind: 'house', at: [92, 182], from: 0.3, to: 1 },
    ],
    rts: { at: [86, 182], to: [87, 178], height: [40, 36] },
  },
  g_conquista: {
    mission: 'm8_independencia',
    time: 0.6,
    hud: true,
    warmup: 0.2,
    rows: [
      { kind: 'rifleman', owner: 0, count: 16, at: [120, 166], to: [148, 152], order: 'move', select: true },
      { kind: 'hussar', owner: 0, count: 6, at: [114, 170], to: [142, 156], order: 'move', select: true },
    ],
    rts: { at: [126, 163], to: [132, 160], height: [42, 40], follow: true },
  },
  g_resiste: {
    mission: 'm_real_felipe',
    time: 0.36,
    hud: true,
    warmup: 2.4,
    rows: [
      { kind: 'artillery', owner: 0, count: 3, at: [176, 101], to: [150, 100], order: 'hold', select: true },
      { kind: 'rifleman', owner: 0, count: 8, at: [182, 94], to: [182, 94], order: 'hold', select: true },
      { kind: 'soldier', owner: 1, count: 14, at: [146, 100], to: [164, 98], order: 'attack_move', immortal: true },
    ],
    rts: { at: [168, 100], to: [166, 100], height: [44, 40] },
  },
};

const ORDER = [...PLAN.acts.flatMap((a) => a.shots.map((s) => s.name)), ...PLAN.montage.shots.map((s) => s.name)];
const SECONDS = Object.fromEntries(
  [...PLAN.acts.flatMap((a) => a.shots), ...PLAN.montage.shots].map((s) => [s.name, s.seconds]),
);

let written = 0;
const started = Date.now();

async function main() {
  fs.mkdirSync(dir, { recursive: true });
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  try {
    for (const name of ORDER) {
      if (only && !only.split(',').includes(name)) continue;
      const shot = { name, ...SHOTS[name], frames: preview || Math.round((SECONDS[name] + 0.4) * PLAN.fps) };
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      page.on('pageerror', (e) => console.error(`[t60] ${name} PAGEERROR`, e.message));
      await page.goto(`${base}/?mission=${shot.mission}&seed=777&fog=0&cine=1&intro=0&noloop=1`, {
        waitUntil: 'networkidle',
      });
      await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
      await page
        .locator('.ed-primary', { hasText: 'COMENZAR' })
        .first()
        .click({ timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(2500);
      await prepare(page, shot);
      await film(page, shot);
      await context.close();
    }
  } finally {
    await browser.close();
    await close();
  }
  console.log(`[t60] ${dir}: ${written} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

/** Freeze the match into a hand-driven renderer and stage the shot. */
async function prepare(page, shot) {
  await page.evaluate(
    ({ shot, vertical }) => {
      const g = window.game;
      g.loop.stop();
      document.querySelector('.ed-mission-card')?.remove();
      g.hud.showToast = () => {};
      g.hud.showDialogue = () => {};
      g.hud.isMissionCardOpen = () => false;
      if (shot.hud) {
        // Narration, objectives and tutorial cards cover the play in a gameplay shot; hide them by id, not
        // by size (the 9:16 layout moved them past every size rule).
        const style = document.createElement('style');
        style.textContent = '#ed-dialogue,#ed-objectives,#ed-tutorial,.obj-list{display:none!important}';
        document.head.appendChild(style);
      }
      if (!shot.hud) {
        g.hud.root.style.display = 'none';
        g.hud.update = () => {};
        if (g.worldLabels) g.worldLabels.root.style.display = 'none';
      }
      g.qualityGovernor.update = () => {};
      g.settings.quality = 'high';
      g.qualityGovernor.setUserQuality('high');
      g.postfx.setCinematic(!shot.hud);
      g.postfx.setQuality('high');
      g.renderer.setPixelRatio(1);
      g.selectUnits([]);
      g.tutorial = null;
      g.missionRings = null;
      // Scripted waves and objectives stay out of the shot.
      g.mission.ended = true;
      if (g.getPaused()) g.togglePause();
      g.trees.kitLod0Radius = 70;
      window.__clock = 0;
      window.__t = 0;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => window.__clock * 1000 });
      const fires = shot.fires ?? [];
      let emit = 0;
      window.__step = (n) => {
        for (let i = 0; i < n; i++) {
          window.__clock += 1 / 60;
          window.__t += 1 / 60;
          g.update(1 / 60, window.__t);
          window.__hp?.();
          for (const id of immortal) {
            const u = g.units.get(id);
            if (u && !u.dead) u.hp = u.maxHp;
          }
          // Burning roofs: fire at the ridge, smoke rising from it.
          if (fires.length && ++emit % 3 === 0) {
            for (const [x, z, h] of fires) {
              const y = g.terrain.getHeight(x, z) + h + 0.6;
              // Many small tongues read as flames; a few big particles read as glowing balls.
              g.particles.emit({
                x,
                y,
                z,
                count: 24,
                color: 0xff7a1c,
                kind: 'fire',
                speed: 2.6,
                life: 0.9,
                size: 1.4,
                spread: 3,
                emissive: true,
              });
              g.particles.emit({
                x,
                y: y + 0.4,
                z,
                count: 4,
                color: 0xffd060,
                kind: 'spark',
                speed: 3.2,
                life: 0.8,
                size: 0.6,
                spread: 2.4,
                emissive: true,
              });
            }
          }
        }
      };
      window.__hide = () => {
        if (shot.hud) {
          g.scene.getObjectByName('mission-rings')?.traverse((o) => (o.visible = false));
          return;
        }
        g.scene.traverse((o) => {
          if (/ring|selection|marker|fauna|wildlife|herd|llama|vicu|deer/i.test(o.name ?? '')) o.visible = false;
        });
        // Tracer and impact glows read as big translucent balls when one passes near the lens.
        for (const o of g.scene.children) {
          const r = o.geometry?.type === 'SphereGeometry' ? o.geometry.parameters.radius : null;
          if ((r === 0.06 || r === 0.5) && o.material?.transparent) o.visible = false;
        }
      };
      const phases = shot.phases ?? [];
      if (phases.length) g.setSitePhase(phases[0][1]);
      window.__phase = (k) => {
        let current = null;
        for (const [at, phase] of phases) if (k >= at) current = phase;
        if (current && current !== window.__lastPhase) {
          window.__lastPhase = current;
          g.setSitePhase(current);
        }
      };

      // Unit blocks: the bulkiest member sets the pitch, and every member heads for its own slot.
      const selected = [];
      const immortal = [];
      const issue = (ids, order, at, to) => {
        for (const id of ids) {
          const u = g.units.get(id);
          if (!u) continue;
          u.clearOrders?.();
          if (order === 'hold') continue;
          const target = { x: to[0] + (u.pos.x - at[0]), z: to[1] + (u.pos.z - at[1]) };
          g.executeCommand({ kind: 'order', unitIds: [id], order: { kind: order, target }, clear: true }, false);
        }
      };
      for (const row of shot.rows ?? []) {
        const fx = row.to[0] - row.at[0];
        const fz = row.to[1] - row.at[1];
        const len = Math.hypot(fx, fz) || 1;
        const [ux, uz] = len > 0.01 ? [fx / len, fz / len] : [1, 0];
        const cols = Math.ceil(Math.sqrt(row.count * 2));
        const ids = [];
        let colPitch = 1.7;
        let rowPitch = 1.9;
        for (let i = 0; i < row.count; i++) {
          const u = g.spawnScriptedUnit(row.kind, row.owner, row.at[0], row.at[1]);
          if (!u) continue;
          if (i === 0) {
            colPitch = Math.max(1.7, (u.spacing ?? 1.4) + 0.4);
            rowPitch = Math.max(1.9, (u.spacing ?? 1.4) * 1.45);
          }
          const c = (i % cols) - (cols - 1) / 2;
          const r = Math.floor(i / cols);
          u.pos.x = row.at[0] - uz * c * colPitch - ux * r * rowPitch;
          u.pos.z = row.at[1] + ux * c * colPitch - uz * r * rowPitch;
          u.pos.y = g.terrain.getHeight(u.pos.x, u.pos.z);
          u.view?.setRotationY?.(Math.atan2(ux, uz));
          ids.push(u.id);
        }
        issue(ids, row.order, row.at, row.to);
        if (row.select) selected.push(...ids);
        // Targets that must outlive the warm-up: one volley killed the whole block before the camera rolled.
        if (row.immortal) immortal.push(...ids);
      }
      if (shot.hero) {
        const spec = shot.hero;
        const all = [...g.units.values()].filter((u) => !u.dead);
        const h = all.find((u) => u.tag === spec.tag && u.owner === 0) ?? all.find((u) => u.tag === spec.tag);
        if (!h) throw new Error(`hero ${spec.tag} not on the field`);
        h.pos.x = spec.at[0];
        h.pos.z = spec.at[1];
        h.pos.y = g.terrain.getHeight(h.pos.x, h.pos.z);
        h.clearOrders?.();
        const face = spec.face ?? spec.to;
        h.view?.setRotationY?.(Math.atan2(face[0] - spec.at[0], face[1] - spec.at[1]));
        if (spec.order !== 'hold') {
          g.executeCommand(
            {
              kind: 'order',
              unitIds: [h.id],
              order: { kind: spec.order, target: { x: spec.to[0], z: spec.to[1] } },
              clear: true,
            },
            false,
          );
        }
        window.__hp = () => {
          h.hp = h.maxHp;
        };
      }
      if (shot.follow) {
        // The hero leads the soldiers who stand near them toward the goal; the camera orbits from the face to
        // the profile (the full trailer's hero shot).
        const spec = shot.follow;
        const all = [...g.units.values()].filter((u) => !u.dead);
        const h = all.find((u) => u.tag === spec.tag && u.owner === 0);
        if (!h) throw new Error(`hero ${spec.tag} not on the field`);
        const home = { x: h.pos.x, z: h.pos.z };
        h.pos.x = spec.at[0];
        h.pos.z = spec.at[1];
        const dx = spec.to[0] - h.pos.x;
        const dz = spec.to[1] - h.pos.z;
        const len = Math.hypot(dx, dz) || 1;
        const d = [dx / len, dz / len];
        // Foot soldiers only: a rider overtakes the hero and crosses the lens.
        const army = all.filter(
          (u) =>
            u.owner === h.owner &&
            (u.kind !== 'worker' || u.tag) &&
            (u === h || (u.spacing ?? 1.4) <= 1.5) &&
            Math.hypot(u.pos.x - home.x, u.pos.z - home.z) < 30,
        );
        const rest = army.filter((u) => u !== h);
        const bulk = Math.max(1.4, ...army.map((u) => u.spacing ?? 1.4));
        const colPitch = Math.max(1.8, bulk + 0.4);
        const rowPitch = Math.max(2.1, bulk * 1.45);
        const cols = Math.min(7, Math.max(3, Math.ceil(Math.sqrt(rest.length * 1.5))));
        rest.forEach((u, i) => {
          const c = (i % cols) - (cols - 1) / 2;
          const r = Math.floor(i / cols) + 1;
          u.pos.x = h.pos.x - d[0] * (r * rowPitch + 0.6) - d[1] * c * colPitch;
          u.pos.z = h.pos.z - d[1] * (r * rowPitch + 0.6) + d[0] * c * colPitch;
          u.clearOrders?.();
        });
        const pace = Math.min(...army.map((u) => u.stats?.speed ?? 3));
        for (const u of army) u.moveSpeedLimit = pace;
        const goal = { x: h.pos.x + d[0] * 34, z: h.pos.z + d[1] * 34 };
        for (const u of army) {
          const target = { x: goal.x + (u.pos.x - h.pos.x), z: goal.z + (u.pos.z - h.pos.z) };
          g.executeCommand({ kind: 'order', unitIds: [u.id], order: { kind: 'move', target }, clear: true }, false);
        }
        window.__hero = h;
        window.__dir = d;
        window.__hp = () => {
          h.hp = h.maxHp;
          if (!h.dead && !h.orderQueue?.length && Math.hypot(h.pos.x - goal.x, h.pos.z - goal.z) > 3)
            h.issueOrder({ kind: 'move', target: goal }, true);
        };
      }
      // Construction sites: placed with the game's own command, built by the selected workers, raised by hand
      // on the shot's clock so the walls rise within 1.5 s.
      const sites = [];
      for (const spec of shot.build ?? []) {
        const before = new Set(g.buildings.keys());
        // The hint spot first, then the nearest free one (the plaza blocks part of the field).
        if (!g.executeCommand({ kind: 'place', building: spec.kind, x: spec.at[0], z: spec.at[1] }, false)) {
          const spot = g.findFreeSpot(spec.at[0], spec.at[1], 7);
          if (spot) g.executeCommand({ kind: 'place', building: spec.kind, x: spot.x, z: spot.z }, false);
        }
        const b = [...g.buildings.values()].find((x) => !before.has(x.id));
        if (!b) throw new Error(`could not place ${spec.kind} at ${spec.at}`);
        sites.push({ b, spec });
      }
      // Each site gets its share of the workers, already standing around it: walking there in one file
      // stacked them, and a builder is not idle, so the game's idle spacing does not open them.
      if (selected.length && sites.length) {
        const per = Math.ceil(selected.length / sites.length);
        sites.forEach(({ b }, si) => {
          const crew = selected.slice(si * per, (si + 1) * per);
          crew.forEach((id, i) => {
            const u = g.units.get(id);
            if (!u) return;
            // The near half of the footprint, toward the camera (south), so the crew is not hidden.
            const a = Math.PI * (0.15 + (0.7 * i) / Math.max(1, crew.length - 1));
            const r = (b.radius ?? 2.5) + 0.9;
            u.pos.x = b.pos.x + Math.cos(a) * r;
            u.pos.z = b.pos.z + Math.sin(a) * r;
            u.pos.y = g.terrain.getHeight(u.pos.x, u.pos.z);
            u.view?.setRotationY?.(Math.atan2(b.pos.x - u.pos.x, b.pos.z - u.pos.z));
          });
          g.executeCommand(
            { kind: 'order', unitIds: crew, order: { kind: 'build', entityId: b.id }, clear: true },
            false,
          );
        });
      }
      window.__build = (k) => {
        for (const { b, spec } of sites) {
          const ratio = spec.from + (spec.to - spec.from) * Math.min(1, k / 0.85);
          const want = ratio * b.stats.buildTime;
          if (want > b.constructionProgress) b.addBuildProgress(want - b.constructionProgress);
        }
      };
      window.__build(0);
      if (selected.length) g.selectUnits(selected);
      g.sky.setTimeOfDay(shot.time);
      window.__step(Math.round((shot.warmup ?? 0.6) * 60));

      const c = g.camera.camera;
      const ground = (x, z) => g.terrain.getHeight(x, z);
      const ease = (k) => k * k * (3 - 2 * k);
      const lerp = (a, b, e) => a.map((v, i) => v + (b[i] - v) * e);
      window.__cam = (k) => {
        const e = ease(k);
        if (shot.rts) {
          let [x, z] = lerp(shot.rts.at, shot.rts.to, e);
          if (shot.rts.follow && selected.length) {
            // Keep the selected army in the (narrow) frame as it marches.
            const alive = selected.map((id) => g.units.get(id)).filter((u) => u && !u.dead);
            if (alive.length) {
              const cx = alive.reduce((a, u) => a + u.pos.x, 0) / alive.length;
              const cz = alive.reduce((a, u) => a + u.pos.z, 0) / alive.length;
              const f = (window.__rf ??= { x: cx, z: cz });
              f.x += (cx - f.x) * 0.15;
              f.z += (cz - f.z) * 0.15;
              [x, z] = [f.x, f.z];
            }
          }
          g.camera.setYaw(0);
          g.camera.moveTo(x, z, true);
          g.camera.setHeight(shot.rts.height[0] + (shot.rts.height[1] - shot.rts.height[0]) * e);
          g.camera.update(1 / 30, window.__t);
          return;
        }
        if (shot.follow) {
          const h = window.__hero;
          const [dx, dz] = window.__dir;
          const p = (window.__p ??= { x: h.pos.x, z: h.pos.z });
          p.x += (h.pos.x - p.x) * 0.12;
          p.z += (h.pos.z - p.z) * 0.12;
          const a = ((26 + 64 * e) * Math.PI) / 180;
          const ox = dx * Math.cos(a) - dz * Math.sin(a);
          const oz = dx * Math.sin(a) + dz * Math.cos(a);
          const dist = (5.2 + 2.4 * e) * (vertical ? 1.3 : 1);
          const lead = vertical ? 0.8 : 3.5;
          const px = p.x + ox * dist;
          const pz = p.z + oz * dist;
          const tx = p.x + dx * lead * e;
          const tz = p.z + dz * lead * e;
          c.fov = vertical ? 58 : 34;
          c.position.set(px, Math.max(ground(px, pz), ground(p.x, p.z)) + 1.9 + 0.8 * e, pz);
          c.lookAt(tx, ground(tx, tz) + 1.25, tz);
        } else {
          const eye = vertical && shot.v?.eye ? shot.v.eye : shot.eye;
          const look = vertical && shot.v?.look ? shot.v.look : shot.look;
          const [ex, ey, ez] = lerp(eye[0], eye[1], e);
          const [lx, ly, lz] = lerp(look[0], look[1], e);
          c.fov = vertical ? (shot.v?.fov ?? Math.min(78, shot.fov * 1.6)) : shot.fov;
          c.position.set(ex, ground(ex, ez) + ey, ez);
          c.lookAt(lx, ground(lx, lz) + ly, lz);
        }
        c.updateProjectionMatrix();
        c.updateMatrixWorld();
        // Trees between the lens and the action: a trunk across the frame hid the clash.
        if (shot.clearLens && !window.__lensCleared) {
          window.__lensCleared = true;
          const eye = vertical && shot.v?.eye ? shot.v.eye : shot.eye;
          const look = vertical && shot.v?.look ? shot.v.look : shot.look;
          const [a, b] = [eye[0], look[0]];
          const [a2, b2] = [eye[1], look[1]];
          const near = (sx, sz, p, q) => {
            const dx = q[0] - p[0];
            const dz = q[2] - p[2];
            const t = Math.max(0, Math.min(0.75, ((sx - p[0]) * dx + (sz - p[2]) * dz) / (dx * dx + dz * dz)));
            return Math.hypot(sx - p[0] - dx * t, sz - p[2] - dz * t) < 6;
          };
          window.__lensTrees = [];
          g.trees.slots.forEach((t, i) => {
            if (!t.used || !(near(t.x, t.z, a, b) || near(t.x, t.z, a2, b2))) return;
            window.__lensTrees.push(i);
          });
        }
        g.terrain.updateLod(c.position, true);
        g.trees.update(0, { x: c.position.x, z: c.position.z });
        // The resource nodes re-show their trees on every simulation step: hide them again before each render.
        for (const i of window.__lensTrees ?? []) g.trees.setVisible(i, false);
        if (window.__lensTrees?.length) g.trees.update(0, { x: c.position.x, z: c.position.z });
      };
    },
    { shot, vertical },
  );
}

async function film(page, shot) {
  const folder = path.join(dir, shot.name);
  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(folder, { recursive: true });
  for (let i = 0; i < shot.frames; i++) {
    const k = shot.frames === 1 ? 1 : i / (shot.frames - 1);
    const file = path.join(folder, `${String(i).padStart(5, '0')}.jpg`);
    const b64 = await page.evaluate(
      ({ k, hud }) => {
        const g = window.game;
        window.__phase(k);
        window.__build(k);
        window.__step(2);
        window.__hide();
        window.__cam(k);
        g.runtime.frameShadows();
        g.runtime.render();
        return hud ? null : g.renderer.domElement.toDataURL('image/jpeg', 0.93);
      },
      { k, hud: !!shot.hud },
    );
    // Gameplay shots keep the HUD, which lives in the page, not in the canvas.
    if (shot.hud) await page.screenshot({ path: file, type: 'jpeg', quality: 93 });
    else fs.writeFileSync(file, Buffer.from(b64.split(',')[1], 'base64'));
    written++;
  }
  console.log(`[t60] shot ${shot.name}: ${shot.frames} frames (${((Date.now() - started) / 1000).toFixed(0)}s)`);
}

try {
  await main();
} catch (error) {
  console.error('[t60]', error);
  process.exitCode = 1;
}
