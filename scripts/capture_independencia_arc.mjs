import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Capture the Independencia arc's own in-engine intro, briefing and epilogue images:
 * the Lurín road, the Plaza Mayor and the Callao coast for m_lima_1821; the bastion,
 * the batteries and the siege camp for m_real_felipe. These are game captures, never
 * historical photographs.
 *
 * Every card ships at 960x540 WebP q58 with the world label layer hidden: the chapter card already names
 * the place, and the smaller 640x360 cards the arcs started with went soft next to the rest of the set.
 *
 * Usage: node scripts/capture_independencia_arc.mjs [--only=ID]
 */
const only = cliArg('only', '');

const SHOTS = [
  {
    mission: 'm_lima_1821',
    dir: 'lima-1821',
    id: 'plaza',
    at: [90, 150],
    height: 38,
    time: 0.62,
  },
  {
    mission: 'm_lima_1821',
    dir: 'lima-1821',
    id: 'callao',
    at: [58, 119],
    height: 34,
    time: 0.55,
  },
  {
    mission: 'm_lima_1821',
    dir: 'lima-1821',
    id: 'epilogo',
    cinematic: { center: [90, 140], eye: [-38, 22, 44], look: [0, 3, 0], fov: 50, time: 0.28 },
  },
  {
    mission: 'm_real_felipe',
    dir: 'real-felipe',
    id: 'bastion',
    cinematic: { center: [179.7, 97.3], eye: [-22, 9, 12], look: [0, 3, 0], fov: 55, time: 0.55 },
  },
  {
    mission: 'm_real_felipe',
    dir: 'real-felipe',
    id: 'baterias',
    at: [129.3, 133.1],
    height: 38,
    time: 0.55,
  },
  {
    mission: 'm_real_felipe',
    dir: 'real-felipe',
    id: 'epilogo',
    cinematic: { center: [179.7, 97.3], eye: [28, 16, -30], look: [0, 3, 0], fov: 50, time: 0.25 },
  },
];

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    if (only && shot.id !== only) continue;
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
        if (shot.mission === 'm_real_felipe' && shot.id === 'baterias') {
          // The two batteries are the player's objective, not a starting building: stage the line the card
          // names, or the frame is empty sand.
          g.spawnScriptedBuilding('fortress', 0, 0.46 * 256, 0.56 * 256);
          g.spawnScriptedBuilding('fortress', 0, 0.55 * 256, 0.48 * 256);
        }
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
    const file = path.join(out, `intro-${shot.id}.webp`);
    await sharp(png).resize(960, 540).webp({ quality: 58 }).toFile(file);
    console.log(`captured ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
