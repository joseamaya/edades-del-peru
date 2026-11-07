import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer } from './lib.mjs';

/**
 * Capture the narrated m1 intro and act-card images from the game itself (an in-engine recreation, never a
 * historical photograph): Áspero, the Supe valley, the works on the Pyramid Mayor, the city in use, the
 * drought and the departure. Each scene is staged through the debug harness (phase, drought, worker
 * orders), rendered without the HUD at 1600x900 and stored as a 960x540 WebP in public/media/caral/.
 *
 * Usage: node scripts/capture_caral_intro.mjs
 */
const OUT = path.join(process.cwd(), 'public', 'media', 'caral');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { id: 'aspero', at: [30, 178], height: 26, setup: 'fishing' },
  { id: 'valle', at: [82, 104], height: 40, setup: 'none' },
  { id: 'obra', at: [164, 50], height: 40, setup: 'works' },
  { id: 'ciudad', at: [162, 78], height: 52, setup: 'city' },
  { id: 'sequia', at: [84, 118], height: 52, setup: 'drought' },
  { id: 'partida', at: [26, 168], height: 28, setup: 'departure' },
];

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
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
          moveAll(160, 56);
        }
        if (shot.setup === 'city') g.setSitePhase('in_use');
        if (shot.setup === 'drought' || shot.setup === 'departure') {
          g.setSitePhase('in_use');
          g.startDrought(true);
        }
        if (shot.setup === 'departure') moveAll(24, 166);
        let t = 1;
        for (let i = 0; i < 20 * 30; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        g.camera.focusOn(shot.at[0], shot.at[1]);
        g.camera.setHeight(shot.height);
        for (let i = 0; i < 60; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        // Re-apply the drought last: the quality preset can rebuild the terrain material after it.
        if (shot.setup === 'drought' || shot.setup === 'departure') {
          g.droughtShown = -1;
          g.startDrought(true);
        }
        g.trees.update(0, g.camera.getTarget());
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
