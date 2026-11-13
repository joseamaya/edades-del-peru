import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Capture the La Ciudad de los Reyes intro, chapter-card and epilogue images from the game itself
 * (in-engine recreations, never historical photographs): the plaza and church, the Rímac crossing, the
 * hills of Quizu and the city at dusk.
 *
 * Usage: node scripts/capture_lima_intro.mjs [--only=ciudad]
 */
const OUT = path.join(process.cwd(), 'public', 'media', 'lima');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { id: 'ciudad', at: [90, 150], height: 38, time: 0.62 },
  { id: 'rimac', at: [118, 126], height: 36, time: 0.5 },
  { id: 'cerco', at: [190, 85], height: 46, time: 0.55 },
  {
    id: 'epilogo',
    cinematic: { center: [100, 145], eye: [-38, 22, 44], look: [0, 3, 0], fov: 50, time: 0.28 },
  },
];
const only = cliArg('only', '');

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    if (only && shot.id !== only) continue;
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await page.goto(`${base}/?mission=m_lima&intro=0&fog=0&seed=777&noloop=1`, { waitUntil: 'networkidle' });
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
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
        const ui = document.getElementById('ui-root');
        if (ui) ui.style.display = 'none';
        if (g.getPaused()) g.togglePause();
        g.setSitePhase('ciudad');
        g.applyQualityPreset('high');
        g.trees.kitLod0Radius = 60;
        g.sky.setTimeOfDay(shot.time ?? 0.5);
        let t = 1;
        for (let i = 0; i < 30; i++) {
          g.update(0.05, t);
          t += 0.05;
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
    const file = path.join(OUT, `intro-${shot.id}.webp`);
    await sharp(png).resize(960, 540).webp({ quality: 58 }).toFile(file);
    console.log(`captured ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
