import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Capture the stills of Tarapacá's cinema intro from the game itself (an in-engine recreation, never a
 * photograph): a low camera, staged troops and the light of the hour, rendered at 1920x1080 and stored as
 * full-HD WebP in public/media/tarapaca/cine-*.webp. The intro pans and zooms over them, so they keep their
 * full resolution (the slide intro shrank its stills to 640x360).
 *
 * Usage: node scripts/capture_tarapaca_cinema.mjs [--only=ID] [--gpu]
 */
const only = cliArg('only', '');
const OUT = path.join(process.cwd(), 'public', 'media', 'tarapaca');

/**
 * `stage` lists troops to place before the shot: `kind`, `owner`, a row from `from` to `to` (world
 * coordinates) with `count` units, then a short march toward `face` so they turn to it.
 */
const SHOTS = [
  {
    id: 'cine-quebrada',
    // Dawn over the quebrada: the village on the valley floor, the heights and Pachica behind it.
    center: [96, 168],
    eye: [-38, 24, 40],
    look: [34, 0, -26],
    fov: 48,
    time: 0.27,
    stage: [],
  },
  {
    id: 'cine-linea',
    // The Peruvian line east of the village as the first column crosses the plain toward it.
    center: [122, 168],
    eye: [-26, 17, 22],
    look: [16, 0, -4],
    fov: 42,
    time: 0.42,
    stage: [
      { kind: 'republica_defensor', owner: 0, from: [124, 161], to: [125, 175], count: 10, rows: 2, face: [160, 168] },
      { kind: 'chile_infante', owner: 1, from: [146, 160], to: [148, 174], count: 8, rows: 2, face: [100, 168] },
    ],
  },
];

fs.mkdirSync(OUT, { recursive: true });
const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    if (only && shot.id !== only) continue;
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await page.goto(`${base}/?mission=m_tarapaca&intro=0&fog=0&seed=777&noloop=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
    await page
      .locator('.ed-primary', { hasText: 'COMENZAR' })
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(2500);
    await page.evaluate(
      ({ shot }) => {
        const g = window.game;
        document.querySelector('.ed-mission-card')?.remove();
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
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
        for (const row of shot.stage) {
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
    const file = path.join(OUT, `${shot.id}.webp`);
    await sharp(png).webp({ quality: 80 }).toFile(file);
    console.log(`captured ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
