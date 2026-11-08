import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { cliArg, launchChromium, withViteServer } from './lib.mjs';

/**
 * Capture the narrated m1 intro and act-card images from the game itself (an in-engine recreation, never a
 * historical photograph): Áspero, the Supe valley, the works on the Pyramid Mayor, the city in use, the
 * drought and the departure. Each scene is staged through the debug harness (phase, drought, worker
 * orders), rendered without the HUD at 1600x900 and stored as a 960x540 WebP in public/media/caral/. The
 * works and the drought use a low cinematic camera (`eye`/`look`), the others the game's RTS camera.
 * The `menu` shot is the title/menu backdrop: a low cinematic camera over the
 * Sacred City at dawn: the Pyramid Mayor and its neighbours against the eastern hills under a low sun,
 * rendered at 1920x1080 and graded (a darker top edge and a vignette) into public/media/menu/caral-dawn.webp.
 * The map's west edge shows at the top left, under the menu's own left shade.
 *
 * Usage: node scripts/capture_caral_intro.mjs [--only=menu]
 */
const OUT = path.join(process.cwd(), 'public', 'media', 'caral');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { id: 'aspero', at: [30, 178], height: 26, setup: 'fishing' },
  { id: 'valle', at: [82, 104], height: 40, setup: 'none' },
  { id: 'obra', setup: 'works', eye: [-34, 26, 31], look: [-14, 3, -11], fov: 46, time: 0.62 },
  { id: 'ciudad', at: [162, 78], height: 52, setup: 'city' },
  { id: 'sequia', setup: 'drought', eye: [-112, 24, 85], look: [-46, 4, 39], fov: 50, time: 0.55, settle: 80 },
  { id: 'partida', at: [26, 168], height: 28, setup: 'departure' },
  // Eye and target relative to the site (the Sacred City plaza), with the field of view and time of day.
  { id: 'menu', setup: 'menu', eye: [-55, 26, 60], look: [-14, 6, -28], fov: 45, time: 0.66, size: [1920, 1080] },
];
const only = cliArg('only', '');

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    if (only && shot.id !== only) continue;
    const [width, height] = shot.size ?? [1600, 900];
    const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
    await page.goto(`${base}/?play=1&mission=m1_caral&intro=0&fog=0&seed=3000&noloop=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game?.trees?.hasKit?.('algarrobo'), null, { timeout: 90_000 });
    await page
      .locator('button', { hasText: 'COMENZAR' })
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
        g.applyQualityPreset('high');
        g.trees.kitLod0Radius = 60;
        const workers = [...g.units.values()].filter((u) => u.owner === 0 && u.kind === 'worker');
        const order = (u, o) => g.executeCommand({ kind: 'order', unitIds: [u.id], order: o, clear: true }, false);
        const moveAll = (x, z) =>
          workers.forEach((u, i) =>
            order(u, { kind: 'move', target: { x: x + (i % 3) * 2.2, z: z + Math.floor(i / 3) * 2.2 } }),
          );
        if (shot.setup === 'fishing') {
          const grounds = [...g.resourceNodes.values()].filter((n) => n.kind === 'fishing');
          workers.forEach((u, i) => order(u, { kind: 'gather', entityId: grounds[i % grounds.length].id }));
        }
        if (shot.setup === 'works') {
          g.setSitePhase('fill');
          // A crew scattered at the foot of the rising platform, around the site (the plaza).
          const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
          for (let i = 0; i < 8; i++) g.spawnScriptedUnit('worker', 0, site.x - 12 + i * 2, site.z + 8);
          const crew = [...g.units.values()].filter((u) => u.owner === 0 && u.kind === 'worker');
          const spots = [
            [-23, 2],
            [-18, 4],
            [-13, 2],
            [-8, 5],
            [-4, 2],
            [-21, 7],
            [-15, 8],
            [-10, 9],
            [-5, 7],
            [-26, 5],
            [-1, 5],
            [-12, 11],
          ];
          crew.forEach((u, i) => {
            const [dx, dz] = spots[i % spots.length];
            order(u, { kind: 'move', target: { x: site.x + dx, z: site.z + dz } });
          });
        }
        if (shot.setup === 'city') g.setSitePhase('in_use');
        if (shot.setup === 'menu') {
          g.setSitePhase('in_use');
          const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
          for (let i = 0; i < 14; i++) {
            g.spawnScriptedUnit('worker', 0, site.x - 10 + (i % 5) * 3, site.z + 14 + Math.floor(i / 5) * 3);
          }
        }
        if (shot.setup === 'drought' || shot.setup === 'departure') {
          g.setSitePhase('in_use');
          g.startEnvironmentalEvent('drought', true);
        }
        if (shot.setup === 'departure') moveAll(24, 166);
        let t = 1;
        for (let i = 0; i < 20 * 30; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        if (shot.at) {
          g.camera.focusOn(shot.at[0], shot.at[1]);
          g.camera.setHeight(shot.height);
        }
        for (let i = 0; i < 60; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        // Re-apply the drought last: the quality preset can rebuild the terrain material after it.
        if (shot.setup === 'drought' || shot.setup === 'departure') {
          g.droughtShown = -1;
          g.startEnvironmentalEvent('drought', true);
        }
        if (shot.eye) {
          const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
          const [lx, ly, lz] = [site.x + shot.look[0], shot.look[1], site.z + shot.look[2]];
          // The terrain, water and cover take the sky's light (and the drought its dust) only in running frames.
          g.sky.setTimeOfDay(shot.time);
          g.camera.focusOn(lx, lz);
          for (let i = 0; i < (shot.settle ?? 4); i++) {
            g.update(0.05, t);
            t += 0.05;
          }
          if (!g.getPaused()) g.togglePause();
          const c = g.camera.camera;
          c.fov = shot.fov;
          c.position.set(site.x + shot.eye[0], shot.eye[1], site.z + shot.eye[2]);
          c.lookAt(lx, ly, lz);
          c.updateProjectionMatrix();
          c.updateMatrixWorld();
          g.terrain.updateLod(c.position, true);
          g.runtime.frameShadows();
          g.trees.update(0, { x: lx, z: lz });
        } else {
          g.trees.update(0, g.camera.getTarget());
        }
        g.runtime.render();
      },
      { shot },
    );
    await page.waitForTimeout(500);
    const png = await page.screenshot({ type: 'png' });
    if (shot.id === 'menu') {
      const file = path.join(process.cwd(), 'public', 'media', 'menu', 'caral-dawn.webp');
      // Grade: a darker top edge and a soft vignette.
      const grade = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
          '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#06080b" stop-opacity=".55"/><stop offset=".14" stop-color="#06080b" stop-opacity="0"/>' +
          '</linearGradient>' +
          '<radialGradient id="v" cx=".55" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/>' +
          '<stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient></defs>' +
          `<rect width="100%" height="100%" fill="url(#sky)"/><rect width="100%" height="100%" fill="url(#v)"/></svg>`,
      );
      await sharp(png)
        .composite([{ input: grade }])
        .modulate({ saturation: 1.08 })
        .webp({ quality: 72 })
        .toFile(file);
      console.log(`captured ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
      await page.close();
      continue;
    }
    const file = path.join(OUT, `intro-${shot.id}.webp`);
    await sharp(png).resize(960, 540).webp({ quality: 58 }).toFile(file);
    console.log(`captured ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
