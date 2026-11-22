import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg, waitForHighlandKits } from './lib.mjs';
import { CINEMA_SHOTS } from './cinema-shots/index.mjs';

/**
 * Capture the stills of the cinema intros from the game itself (in-engine recreations, never photographs):
 * a low camera, staged troops and the light of the hour, rendered at 1920x1080 and stored as full-HD WebP in
 * public/media/<dir>/<id>.webp. The intro pans and zooms over them, so they keep their full resolution.
 *
 * The shots live in scripts/cinema-shots/<campaign>.mjs, one entry per mission:
 *   { mission, dir, shots: [{ id, center, eye, look, fov, time, phase?, stage }] }
 * `center` is the world point the camera is placed around; `eye` and `look` are offsets from it (y is height
 * above the ground). `phase` sets the site phase (`Game.setSitePhase`) before the shot. `stage` lists troops to place before the shot: `kind`, `owner`, a row from `from` to `to`
 * (world coordinates) with `count` units in `rows`, then a short march toward `face` so they turn to it.
 *
 * Usage: node scripts/capture_cinema.mjs [--mission=ID] [--only=SHOT_ID] [--gpu]
 */
const only = cliArg('only', '');
/** Byte target per still (the test allows 160 KB) and the lowest WebP quality used to reach it. */
const TARGET_BYTES = 76 * 1024;
const MIN_QUALITY = 45;
const onlyMission = cliArg('mission', '');

const missions = CINEMA_SHOTS.filter((m) => !onlyMission || m.mission === onlyMission);
if (missions.length === 0) {
  console.error(`no cinema shots for mission '${onlyMission}'`);
  process.exit(1);
}

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const entry of missions) {
    const out = path.join(process.cwd(), 'public', 'media', entry.dir);
    fs.mkdirSync(out, { recursive: true });
    for (const shot of entry.shots) {
      if (only && shot.id !== only) continue;
      const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
      await page.goto(`${base}/?mission=${entry.mission}&intro=0&fog=0&seed=777&noloop=1`, {
        waitUntil: 'networkidle',
      });
      await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
      await page
        .locator('.ed-primary', { hasText: 'COMENZAR' })
        .first()
        .click({ timeout: 5000 })
        .catch(() => {});
      await page
        .getByRole('button', { name: /omitir tutorial/i })
        .click({ timeout: 2000 })
        .catch(() => {});
      await page.waitForTimeout(2500);
      if (entry.mission === 'm_tambotoco') await waitForHighlandKits(page);
      await page.evaluate(
        ({ shot }) => {
          const g = window.game;
          document.querySelector('.ed-mission-card')?.remove();
          const ui = document.getElementById('ui-root');
          if (ui) ui.style.display = 'none';
          // Place names, character names and objective rings belong to the game view, not to a still.
          if (g.worldLabels) g.worldLabels.root.style.display = 'none';
          const hideRings = () =>
            g.scene.traverse((o) => {
              if (/ring|selection|marker/i.test(o.name ?? '')) o.visible = false;
            });
          hideRings();
          // The scripted waves must not walk into the shot.
          g.mission.ended = true;
          // A site that grows by phases (Chavín, Caral) can be shown at a later stage than the opening.
          if (shot.phase) g.setSitePhase(shot.phase);
          if (g.getPaused()) g.togglePause();
          g.applyQualityPreset('high');
          g.trees.kitLod0Radius = 60;
          let t = 1;
          const tick = (n) => {
            for (let i = 0; i < n; i++) {
              g.update(0.05, t);
              t += 0.05;
            }
          };
          for (const row of shot.stage ?? []) {
            const perRow = Math.ceil(row.count / row.rows);
            const ids = [];
            for (let i = 0; i < row.count; i++) {
              const r = Math.floor(i / perRow);
              const k = (i % perRow) / Math.max(1, perRow - 1);
              // Rows step back away from the facing point.
              const fx = row.face[0] - row.from[0];
              const fz = row.face[1] - row.from[1];
              const len = Math.hypot(fx, fz) || 1;
              const x = row.from[0] + (row.to[0] - row.from[0]) * k - (fx / len) * r * 1.9;
              const z = row.from[1] + (row.to[1] - row.from[1]) * k - (fz / len) * r * 1.9;
              ids.push(g.spawnScriptedUnit(row.kind, row.owner, x, z).id);
            }
            g.executeCommand(
              {
                kind: 'order',
                unitIds: ids,
                order: { kind: 'move', target: { x: row.face[0], z: row.face[1] } },
                clear: true,
              },
              false,
            );
          }
          // A short step turns the troops toward their front, then they halt.
          tick(6);
          for (const u of g.units.values()) if (u.orderQueue) u.orderQueue.length = 0;
          tick(4);
          const { eye, look, fov, time, center } = shot;
          const lx = center[0] + look[0];
          const lz = center[1] + look[2];
          g.sky.setTimeOfDay(time);
          g.camera.focusOn(lx, lz);
          tick(6);
          if (!g.getPaused()) g.togglePause();
          const c = g.camera.camera;
          const ey = g.terrain.getHeight(center[0] + eye[0], center[1] + eye[2]) + eye[1];
          const ly = g.terrain.getHeight(lx, lz) + look[1];
          c.fov = fov;
          c.position.set(center[0] + eye[0], ey, center[1] + eye[2]);
          c.lookAt(lx, ly, lz);
          c.updateProjectionMatrix();
          c.updateMatrixWorld();
          g.terrain.updateLod(c.position, true);
          g.runtime.frameShadows();
          g.trees.update(0, { x: lx, z: lz });
          hideRings();
          g.selection?.clear?.();
          g.runtime.render();
        },
        { shot },
      );
      await page.waitForTimeout(600);
      const png = await page.screenshot({ type: 'png' });
      const file = path.join(out, `${shot.id}.webp`);
      // ADR 0008 fits forty stills in about 3 MB, so each aims at ~76 KB (the test allows 160 KB). Busy ground (forest,
      // grass) compresses badly, so the quality steps down until the still fits.
      let quality = 80;
      let webp = await sharp(png).webp({ quality }).toBuffer();
      while (webp.length > TARGET_BYTES && quality > MIN_QUALITY) {
        quality -= 5;
        webp = await sharp(png).webp({ quality }).toBuffer();
      }
      fs.writeFileSync(file, webp);
      console.log(`captured ${path.relative(process.cwd(), file)} (${webp.length} bytes, q${quality})`);
      if (webp.length > TARGET_BYTES) console.warn(`  over the ${TARGET_BYTES}-byte target: reframe the shot`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await close();
}
