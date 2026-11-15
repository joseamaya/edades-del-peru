import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Capture the Inca civil war intro, chapter-card and epilogue images from the game itself (an in-engine
 * recreation, never a historical photograph): the Quito camp, Quipaipan and the capture of Huáscar, plus a
 * dusk epilogue. Rendered without the HUD or character nameplates at 1600x900 and stored as 960x540 WebP in
 * public/media/cusco-inca/.
 *
 * Usage: node scripts/capture_cusco_inca_intro.mjs [--only=quipaipan]
 */
const OUT = path.join(process.cwd(), 'public', 'media', 'cusco-inca');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  {
    id: 'guerra',
    cinematic: { centre: 'player', eye: [-26, 15, 24], look: [0, 1, 0], fov: 52, time: 0.6 },
  },
  { id: 'quipaipan', anchor: 'site', height: 46, time: 0.52 },
  {
    id: 'captura',
    centre: 'enemy',
    cinematic: { eye: [-30, 16, 20], look: [0, 3, 0], fov: 50, time: 0.46 },
  },
  {
    id: 'epilogo',
    anchor: 'site',
    cinematic: { eye: [-42, 20, 38], look: [0, 3, 0], fov: 50, time: 0.24 },
  },
];
const only = cliArg('only', '');

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    if (only && shot.id !== only) continue;
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await page.goto(`${base}/?mission=m6b_guerra_civil&intro=0&fog=0&seed=777&noloop=1`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(
      () => window.game?.mission !== undefined && !!window.game?.landmark?.getObjectByName('cusco_inca_site'),
      null,
      { timeout: 90_000 },
    );
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
        const ui = document.getElementById('ui-root');
        if (ui) ui.style.display = 'none';
        if (g.getPaused()) g.togglePause();
        g.loop.stop();
        g.selectUnits([]);
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
        const labels = document.getElementById('ed-world-labels');
        if (labels) labels.style.display = 'none';
        g.applyQualityPreset('high');
        const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
        const enemy = g.resolveMissionPoint({ ref: 'enemy', dx: 0, dz: 0 });
        const base = g.playerCenter(0);
        const centre = shot.anchor === 'site' ? site : shot.centre === 'enemy' ? enemy : { x: base.x, z: base.z };
        g.sky.setTimeOfDay(shot.time ?? 0.5);
        let t = 1;
        for (let i = 0; i < 30; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        if (shot.cinematic) {
          const { eye, look, fov, time } = shot.cinematic;
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
          g.camera.focusOn(centre.x, centre.z);
          g.camera.setHeight(shot.height);
          for (let i = 0; i < 60; i++) {
            g.update(0.05, t);
            t += 0.05;
          }
          g.trees.update(0, g.camera.getTarget());
        }
        g.runtime.render();
        g.characterLabels?.setVisible(false);
      },
      { shot },
    );
    await page.waitForTimeout(500);
    const png = await page.screenshot({ type: 'png' });
    const file = path.join(OUT, `intro-${shot.id}.webp`);
    await sharp(png).resize(960, 540).webp({ quality: 58 }).toFile(file);
    console.log(`captured ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
