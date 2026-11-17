import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg, waitForHighlandKits } from './lib.mjs';

/**
 * Capture the Tambotoco intro, chapter-card and epilogue images from the game itself (in-engine
 * recreations, never historical photographs or a claim that the myth happened): a hero shot of the cave, a
 * detail shot of the Huanacaure monolith, a wide shot of the inhabited valley, the traced Inticancha and the
 * founded settlement at dusk. The three beats follow a hero/detail/wide grammar.
 *
 * Usage: node scripts/capture_tambotoco_intro.mjs [--only=cueva]
 */
const OUT = path.join(process.cwd(), 'public', 'media', 'tambotoco');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  // Hero shot: the party leaves the cave mouth, the landmark the story starts from.
  {
    id: 'cueva',
    cinematic: { center: [45, 63], eye: [-14, 6, 18], look: [0, 3, -6], fov: 42, time: 0.58 },
    phase: 'cave',
  },
  // Detail shot: the Huanacaure monolith and its carved niche, framed by the shrine's huts and path.
  {
    id: 'huanacaure',
    cinematic: { center: [120, 106], eye: [-12, 9, 28], look: [0, 4, 0], fov: 40, time: 0.52 },
    phase: 'huanacaure',
  },
  // Wide shot: the inhabited valley — the hualla hamlet, its fields, the stream and the terraces.
  {
    id: 'valle',
    cinematic: { center: [148, 168], eye: [-24, 22, -30], look: [12, 1, 20], fov: 50, time: 0.62 },
    phase: 'huanacaure',
  },
  // Act IV card: Inticancha only traced (plaza and plots), before the player builds it.
  {
    id: 'traza',
    cinematic: { center: [168, 190], eye: [12, 17, 29], look: [-2, 2, 0], fov: 50, time: 0.6 },
    phase: 'inticancha',
  },
  // Victory backdrop: the founded settlement with its four canchas, fields, people and fire at dusk.
  {
    id: 'epilogo',
    cinematic: { center: [168, 190], eye: [12, 24, 22], look: [0, 2, 0], fov: 50, time: 0.3 },
    phase: 'fundada',
  },
];
const only = cliArg('only', '');

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    if (only && shot.id !== only) continue;
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await page.goto(`${base}/?mission=m_tambotoco&intro=0&fog=0&seed=777&noloop=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => window.game?.mission !== undefined && !!window.game?.landmark?.getObjectByName('ayllu_site'),
      null,
      { timeout: 90_000 },
    );
    await page
      .locator('.ed-primary', { hasText: 'COMENZAR' })
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
    await page
      .waitForFunction(
        () => window.game?.landmark?.getObjectByName('ayllu_site')?.userData.heroesReady === true,
        null,
        { timeout: 20_000 },
      )
      .catch(() => {});
    await waitForHighlandKits(page);
    await page.waitForTimeout(2500);
    await page.evaluate(
      ({ shot }) => {
        const g = window.game;
        document.querySelector('.ed-mission-card')?.remove();
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
        // The renderer re-shows the hero nameplates every frame; the captures are illustrations, not HUD shots.
        if (g.characterLabels) {
          g.characterLabels.setVisible(false);
          g.characterLabels.setVisible = () => {};
        }
        const ui = document.getElementById('ui-root');
        if (ui) ui.style.display = 'none';
        const labels = document.getElementById('ed-world-labels');
        if (labels) labels.style.display = 'none';
        if (g.getPaused()) g.togglePause();
        if (shot.phase) g.setSitePhase(shot.phase);
        g.applyQualityPreset('high');
        g.trees.kitLod0Radius = 60;
        g.sky.setTimeOfDay(shot.time ?? 0.5);
        let t = 1;
        for (let i = 0; i < 30; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        const { eye, look, fov, time, center } = shot.cinematic;
        const centre = { x: center[0], z: center[1] };
        const lx = centre.x + look[0];
        const ly = g.terrain.getHeight(centre.x, centre.z) + look[1];
        const lz = centre.z + look[2];
        g.sky.setTimeOfDay(time);
        g.camera.focusOn(lx, lz);
        for (let i = 0; i < 6; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        if (!g.getPaused()) g.togglePause();
        const c = g.camera.camera;
        // `eye` is metres above the ground under the camera, never below the plaza/hamlet it frames:
        // a low shot from a slope would otherwise end up inside the hill.
        const ex = centre.x + eye[0];
        const ez = centre.z + eye[2];
        const ey = Math.max(g.terrain.getHeight(ex, ez) + 2, g.terrain.getHeight(centre.x, centre.z) + eye[1]);
        c.fov = fov;
        c.position.set(ex, ey, ez);
        c.lookAt(lx, ly, lz);
        c.updateProjectionMatrix();
        c.updateMatrixWorld();
        g.terrain.updateLod(c.position, true);
        g.runtime.frameShadows();
        g.trees.update(0, { x: lx, z: lz });
        // The marker layer re-enables itself every update; these are illustrations, not HUD shots.
        if (g.heroMarkers) g.heroMarkers.group.visible = false;
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
