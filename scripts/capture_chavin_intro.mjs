import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { launchChromium, withViteServer } from './lib.mjs';

/**
 * Capture the Chavín intro, chapter-card and epilogue images from the game itself (an in-engine
 * recreation, never a historical photograph): the Mosna valley, the Old Temple, the pilgrimage, the
 * New Temple and the final decline. Staged through the debug harness, rendered without the HUD at
 * 1600x900 and stored as 960x540 WebP in public/media/chavin/.
 *
 * Usage: node scripts/capture_chavin_intro.mjs
 */
const OUT = path.join(process.cwd(), 'public', 'media', 'chavin');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { id: 'intro-valle', phase: 'old_temple_foundation', at: [62, 120], height: 52, people: 0 },
  { id: 'intro-templo', phase: 'old_temple', at: [94, 95], height: 38, people: 5 },
  { id: 'intro-peregrinos', phase: 'new_temple', at: [98, 100], height: 44, people: 12 },
  { id: 'intro-nuevo', phase: 'apogee', at: [100, 96], height: 40, people: 10 },
  { id: 'intro-declive', phase: 'apogee', at: [98, 94], height: 50, people: 2 },
];

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const shot of SHOTS) {
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await page.goto(`${base}/?mission=m2_chavin&intro=0&fog=0&low=1&noloop=1&seed=900`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
    await page
      .locator('.ed-overlay', { hasText: 'El Oráculo de Chavín' })
      .getByRole('button', { name: /COMENZAR MISIÓN/ })
      .click({ timeout: 15_000 });
    await page.waitForFunction(() => window.game?.chavinCity?.group.children.length > 0, null, { timeout: 60_000 });
    await page.evaluate(
      ({ shot }) => {
        const g = window.game;
        document.querySelector('.ed-mission-card')?.remove();
        const ui = document.getElementById('ui-root');
        if (ui) ui.style.display = 'none';
        if (g.getPaused()) g.togglePause();
        g.applyQualityPreset('high');
        g.trees.kitLod0Radius = 70;
        g.setSitePhase(shot.phase);
        for (let i = 0; i < shot.people; i++) {
          g.spawnScriptedUnit('worker', 0, 90 + (i % 6) * 4, 100 + Math.floor(i / 6) * 3);
        }
        g.camera.moveTo(shot.at[0], shot.at[1], true);
        g.camera.setHeight(shot.height);
        let t = 1;
        for (let i = 0; i < 50; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
      },
      { shot },
    );
    await page.waitForTimeout(800);
    const png = path.join(OUT, `${shot.id}.png`);
    await page.screenshot({ path: png });
    await sharp(png)
      .resize(960, 540, { fit: 'cover' })
      .webp({ quality: 60 })
      .toFile(path.join(OUT, `${shot.id}.webp`));
    fs.unlinkSync(png);
    console.log(`captured ${shot.id}`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
