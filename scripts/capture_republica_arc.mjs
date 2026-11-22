import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Capture the República arc's own in-engine intro, briefing and epilogue images:
 * Tarapacá (quebrada, heights, retreat), Miraflores (Lima, redoubts, withdrawal)
 * and La Breña (Mantaro, ambush pass, Huamachuco). Game captures, never photographs.
 *
 * Usage: node scripts/capture_republica_arc.mjs [--only=ID]
 */
const only = cliArg('only', '');
const onlyMission = cliArg('mission', '');

const SHOTS = [
  {
    mission: 'm_tarapaca',
    dir: 'tarapaca',
    id: 'quebrada',
    at: [96, 168],
    height: 46,
    time: 0.55,
  },
  {
    mission: 'm_tarapaca',
    dir: 'tarapaca',
    id: 'alturas',
    at: [160, 120],
    height: 42,
    time: 0.5,
  },
  {
    mission: 'm_tarapaca',
    dir: 'tarapaca',
    id: 'retirada',
    cinematic: { center: [140, 140], eye: [-34, 18, 38], look: [0, 3, 0], fov: 52, time: 0.35 },
  },
  {
    mission: 'm_tarapaca',
    dir: 'tarapaca',
    id: 'epilogo',
    cinematic: { center: [96, 168], eye: [26, 18, -34], look: [0, 3, 0], fov: 50, time: 0.24 },
  },
  {
    mission: 'm_miraflores',
    dir: 'miraflores',
    id: 'reductos',
    at: [112, 190],
    height: 44,
    time: 0.55,
  },
  {
    mission: 'm_miraflores',
    dir: 'miraflores',
    id: 'retirada',
    cinematic: { center: [112, 190], eye: [-30, 16, 36], look: [0, 3, 0], fov: 52, time: 0.35 },
  },
  {
    mission: 'm_miraflores',
    dir: 'miraflores',
    id: 'epilogo',
    cinematic: { center: [90, 150], eye: [28, 18, -34], look: [0, 3, 0], fov: 50, time: 0.26 },
  },
  {
    mission: 'm_brena',
    dir: 'brena',
    id: 'mantaro',
    at: [90, 160],
    height: 48,
    time: 0.55,
  },
  {
    mission: 'm_brena',
    dir: 'brena',
    id: 'galgas',
    at: [154, 141],
    height: 44,
    time: 0.5,
  },
  {
    mission: 'm_brena',
    dir: 'brena',
    id: 'huamachuco',
    at: [180, 95],
    height: 44,
    time: 0.45,
  },
  {
    mission: 'm_brena',
    dir: 'brena',
    id: 'epilogo',
    cinematic: { center: [120, 150], eye: [-34, 20, 38], look: [0, 3, 0], fov: 50, time: 0.26 },
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
        if (g.getPaused()) g.togglePause();
        g.applyQualityPreset('high');
        if (shot.mission === 'm_miraflores') {
          for (const x of [72, 112, 152]) g.spawnScriptedBuilding('fortress', 0, x, 190);
        }
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
    const file = path.join(out, `intro-${shot.id}.webp`);
    await sharp(png).resize(640, 360).webp({ quality: 28 }).toFile(file);
    console.log(`captured ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
