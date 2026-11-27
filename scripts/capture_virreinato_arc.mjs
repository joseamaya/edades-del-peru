import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Capture the Virreinato arc's own in-engine images: the 1536 Cusco siege and
 * the 1572 Vilcabamba withdrawal. Game captures, never historical photographs.
 *
 * Every card ships at 960x540 WebP q58 with the world label layer hidden: the chapter card already names
 * the place, and the smaller 640x360 cards the arcs started with went soft next to the rest of the set.
 *
 * Usage: node scripts/capture_virreinato_arc.mjs [--mission=ID] [--only=ID]
 */
const only = cliArg('only', '');
const onlyMission = cliArg('mission', '');

const SHOTS = [
  { mission: 'm_cusco_1536', dir: 'cusco-1536', id: 'ciudad', at: [166, 174], height: 30, time: 0.55 },
  { mission: 'm_cusco_1536', dir: 'cusco-1536', id: 'sacsay', at: [158, 141], height: 40, time: 0.5 },
  {
    mission: 'm_cusco_1536',
    dir: 'cusco-1536',
    id: 'retirada',
    cinematic: { center: [166, 174], eye: [-32, 18, 36], look: [0, 3, 0], fov: 52, time: 0.35 },
  },
  {
    mission: 'm_cusco_1536',
    dir: 'cusco-1536',
    id: 'epilogo',
    cinematic: { center: [100, 190], eye: [28, 18, -34], look: [0, 3, 0], fov: 50, time: 0.26 },
  },
  { mission: 'm_vilcabamba', dir: 'vilcabamba', id: 'pucara', at: [180, 97], height: 42, time: 0.35 },
  {
    mission: 'm_vilcabamba',
    dir: 'vilcabamba',
    id: 'captura',
    cinematic: { center: [109, 175], eye: [-30, 16, 34], look: [0, 3, 0], fov: 52, time: 0.3 },
  },
  {
    mission: 'm_vilcabamba',
    dir: 'vilcabamba',
    id: 'epilogo',
    cinematic: { center: [90, 166], eye: [28, 18, -34], look: [0, 3, 0], fov: 50, time: 0.22 },
  },
];

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    if ((only && shot.id !== only) || (onlyMission && shot.mission !== onlyMission)) continue;
    const out = path.join(process.cwd(), 'public', 'media', shot.dir);
    fs.mkdirSync(out, { recursive: true });
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await page.goto(`${base}/?mission=${shot.mission}&intro=0&fog=0&seed=777&noloop=1`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
    await page
      .locator('.ed-primary', { hasText: 'COMENZAR' })
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(3000);
    await page.evaluate(
      ({ shot }) => {
        const g = window.game;
        document.querySelector('.ed-mission-card')?.remove();
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
        const ui = document.getElementById('ui-root');
        if (ui) ui.style.display = 'none';
        // The card already names the place: the world label layer would bake a second caption in.
        const labels = document.getElementById('ed-world-labels');
        if (labels) labels.style.display = 'none';
        if (g.getPaused()) g.togglePause();
        g.applyQualityPreset('high');
        g.trees.kitLod0Radius = 60;
        g.sky.setTimeOfDay(shot.time ?? 0.5);
        let t = 1;
        for (let i = 0; i < 30; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        if (shot.mission === 'm_cusco_1536' && shot.id === 'ciudad') {
          // The card is the documented fire: light it through the objective the mission reads (ADR 0011).
          // Completing it opens the "La ciudad en llamas" act card, which blocks the mission tick, so the
          // card is cleared on every step until the roofs are burning.
          g.mission.objState.set('a1_sacsay', 'completed');
          for (let i = 0; i < 40; i++) {
            document.querySelector('.ed-mission-card')?.remove();
            g.update(0.05, t);
            t += 0.05;
          }
        }
        if (shot.cinematic) {
          const { eye, look, fov, time, center } = shot.cinematic;
          const centre = { x: center[0], z: center[1] };
          const lx = centre.x + look[0];
          const ly = look[1];
          const lz = centre.z + look[2];
          g.sky.setTimeOfDay(time);
          g.camera.focusOn(lx, lz);
          for (let i = 0; i < 6; i++) {
            g.update(0.05, t);
            t += 0.05;
          }
          if (!g.getPaused()) g.togglePause();
          const c = g.camera.camera;
          c.fov = fov;
          c.position.set(centre.x + eye[0], eye[1], centre.z + eye[2]);
          c.lookAt(lx, ly, lz);
          c.updateProjectionMatrix();
          c.updateMatrixWorld();
          g.terrain.updateLod(c.position, true);
          g.runtime.frameShadows();
          g.trees.update(0, { x: lx, z: lz });
        } else {
          const [x, z] = shot.at;
          g.camera.focusOn(x, z);
          g.camera.setHeight(shot.height);
          for (let i = 0; i < 60; i++) {
            g.update(0.05, t);
            t += 0.05;
          }
          g.trees.update(0, g.camera.getTarget());
        }
        g.runtime.render();
      },
      { shot },
    );
    await page.waitForTimeout(500);
    const png = await page.screenshot({ type: 'png' });
    const file = path.join(out, `intro-${shot.id}.webp`);
    await sharp(png).resize(960, 540).webp({ quality: 58 }).toFile(file);
    console.log(`captured ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
