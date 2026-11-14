import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Capture the Túpac Amaru intro, chapter-card and epilogue images from the game itself (an in-engine
 * recreation, never a historical photograph): the Cusco valley, Sangarará and the Cusco siege, plus the
 * retreat epilogue. Rendered without the HUD or character nameplates at 1600x900 and stored as 960x540
 * WebP in public/media/cusco/.
 *
 * Usage: node scripts/capture_colonial_intro.mjs [--only=valle]
 */
const OUT = path.join(process.cwd(), 'public', 'media', 'cusco');
fs.mkdirSync(OUT, { recursive: true });

const SCALE = 256 / 192;
const SITE = { x: 134.8 * SCALE, z: 73 * SCALE };
const BASE = { x: 73 * SCALE, z: 115 * SCALE };
const SANGARARA = { x: 105 * SCALE, z: 80 * SCALE };

const SHOTS = [
  {
    id: 'valle',
    cinematic: { center: [BASE.x, BASE.z], eye: [-26, 14, 26], look: [0, 2, 0], fov: 52, time: 0.55 },
  },
  { id: 'sangarara', at: [SANGARARA.x, SANGARARA.z], height: 30, time: 0.5 },
  { id: 'cusco', at: [SITE.x, SITE.z], height: 48, time: 0.42 },
  // Eye and target relative to Cusco, with the field of view and time of day.
  {
    id: 'epilogo',
    cinematic: { center: [SITE.x, SITE.z], eye: [-48, 22, 42], look: [0, 3, 0], fov: 50, time: 0.26 },
  },
];
const only = cliArg('only', '');

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    if (only && shot.id !== only) continue;
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await page.goto(`${base}/?mission=m7_tupac_amaru&intro=0&fog=0&seed=777&noloop=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => window.game?.mission !== undefined && !!window.game?.landmark?.getObjectByName('colonial_site'),
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
        g.applyQualityPreset('high');
        g.trees.kitLod0Radius = 60;
        const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
        g.sky.setTimeOfDay(shot.time ?? 0.5);
        let t = 1;
        for (let i = 0; i < 30; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        if (shot.cinematic) {
          const { eye, look, fov, time } = shot.cinematic;
          const centre = shot.cinematic.center ? { x: shot.cinematic.center[0], z: shot.cinematic.center[1] } : site;
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
        // Hide the HTML nameplates after the frame sync re-shows them, and before the screenshot.
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
