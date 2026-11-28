import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Capture the project llama for PR evidence: the clip sheet from Blender (idle / walk / eat) and the caravan
 * in game, with its cargo. The Blender pass is `--render-only`, so it never rewrites the exported GLB.
 *
 * Requires the local Blender authoring tool (not a CI dependency).
 *
 * Usage: node scripts/capture_llama.mjs [--out=docs/media/llama]
 */
const out = path.resolve(cliArg('out', 'docs/media/llama'));
const frames = path.join(reviewDir(), 'llama');
fs.mkdirSync(frames, { recursive: true });

execFileSync(
  'blender',
  ['--background', '--python', 'scripts/blender/build_llama.py', '--', `--stills=${frames}`, '--render-only'],
  { stdio: 'inherit' },
);
const tiles = ['idle-000.png', 'walk-000.png', 'eating-090.png'].map((file) => path.join(frames, file));
for (const file of tiles) if (!fs.existsSync(file)) throw new Error(`missing still ${file}`);
const sheet = await Promise.all(tiles.map((file) => sharp(file).resize(480, 540).toBuffer()));
await sharp({ create: { width: 1440, height: 540, channels: 3, background: '#141414' } })
  .composite(sheet.map((input, index) => ({ input, left: index * 480, top: 0 })))
  .webp({ quality: 82 })
  .toFile(`${out}-clips.webp`);
console.log(`wrote ${path.relative(process.cwd(), `${out}-clips.webp`)} (idle, walk, eat)`);

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  page.on('pageerror', (error) => console.log('PAGEERROR', error.message));
  await page.goto(`${base}/?play=1&mission=m7_tupac_amaru&seed=1780&intro=0&fog=0`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
  await page
    .getByRole('button', { name: /COMENZAR MISIÓN/ })
    .click({ timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  const staged = await page.evaluate(() => {
    const g = window.game;
    g.loop.stop();
    const c = g.playerCenter(0);
    const unit = g.spawnScriptedUnit('caravan', 0, c.x + 42, c.z + 4);
    unit.view.setRotationY(0);
    unit.unitView?.rig?.play('idle', 0);
    for (let i = 0; i < 40; i++) g.loop.onUpdate(1 / 60, i / 60);
    const ui = document.getElementById('ui-root');
    if (ui) ui.style.display = 'none';
    const labels = document.getElementById('ed-world-labels');
    if (labels) labels.style.display = 'none';
    const cam = g.camera.camera;
    const y = unit.pos.y;
    g.renderer.render(g.scene, cam);
    return { x: unit.pos.x, y, z: unit.pos.z };
  });
  await page.waitForTimeout(400);
  const view = async (offset, look) => {
    await page.evaluate(
      ([x, y, z, offset, look]) => {
        const g = window.game;
        const cam = g.camera.camera;
        cam.position.set(x + offset[0], y + offset[1], z + offset[2]);
        cam.lookAt(x, y + look, z);
        g.renderer.render(g.scene, cam);
      },
      [staged.x, staged.y, staged.z, offset, look],
    );
    await page.waitForTimeout(150);
    return sharp(await page.screenshot({ type: 'png' }))
      .resize(700, 394, { fit: 'cover' })
      .toBuffer();
  };
  const side = await view([2.6, 1.5, 3.0], 0.9);
  const front = await view([3.4, 1.4, 0.6], 0.95);
  await sharp({ create: { width: 1400, height: 394, channels: 3, background: '#141414' } })
    .composite([
      { input: side, left: 0, top: 0 },
      { input: front, left: 700, top: 0 },
    ])
    .webp({ quality: 82 })
    .toFile(`${out}-caravan.webp`);
  console.log(`wrote ${path.relative(process.cwd(), `${out}-caravan.webp`)}`);

  // A bare ambient herd on the daylight Caral map, close and at an RTS height, for scale.
  const herdContext = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const herdPage = await herdContext.newPage();
  try {
    await herdPage.goto(`${base}/?play=1&mission=m1_caral&seed=777&intro=0&fog=0`, { waitUntil: 'networkidle' });
    await herdPage.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
    await herdPage
      .getByRole('button', { name: /COMENZAR MISIÓN/ })
      .click({ timeout: 10_000 })
      .catch(() => {});
    await herdPage.waitForTimeout(1500);
    const herd = await herdPage.evaluate(() => {
      const g = window.game;
      g.loop.stop();
      const c = g.playerCenter(0);
      const heightAt = (x, z) => g.terrain.getHeight(x, z);
      // The map can already sit at the 16-animal cap: clear it and re-open the planner for a readable herd.
      g.wildlife.dispose();
      g.wildlife.disposed = false;
      g.wildlife.spawn(
        [
          { id: 'llama', x: c.x + 12, z: c.z + 6, scale: 1 },
          { id: 'llama', x: c.x + 16, z: c.z + 1, scale: 1 },
          { id: 'llama', x: c.x + 20, z: c.z + 8, scale: 1 },
        ],
        heightAt,
      );
      let time = 0;
      for (let i = 0; i < 180; i++) {
        time += 1 / 60;
        g.loop.onUpdate(1 / 60, time);
      }
      const ui = document.getElementById('ui-root');
      if (ui) ui.style.display = 'none';
      const labels = document.getElementById('ed-world-labels');
      if (labels) labels.style.display = 'none';
      const animals = g.wildlife.debugSnapshot().filter((a) => a.species === 'llama' && a.x > c.x + 6 && a.z > c.z - 4);
      return { animals };
    });
    if (!herd.animals.length) throw new Error('no ambient llamas spawned');
    const firstAnimal = herd.animals[0];
    const centroid = {
      x: herd.animals.reduce((sum, animal) => sum + animal.x, 0) / herd.animals.length,
      z: herd.animals.reduce((sum, animal) => sum + animal.z, 0) / herd.animals.length,
    };
    const herdShot = async (close) => {
      await herdPage.evaluate(
        ([animal, center, close]) => {
          const g = window.game;
          const cam = g.camera.camera;
          if (close) {
            cam.position.set(animal.x + 2.4, animal.y + 1.6, animal.z + 3.0);
            cam.lookAt(animal.x, animal.y + 0.95, animal.z);
          } else {
            cam.position.set(center.x, 18, center.z + 13);
            cam.lookAt(center.x, 0.5, center.z);
          }
          g.renderer.render(g.scene, cam);
        },
        [firstAnimal, centroid, close],
      );
      await herdPage.waitForTimeout(180);
      return sharp(await herdPage.screenshot({ type: 'png' }))
        .resize(700, 394, { fit: 'cover' })
        .toBuffer();
    };
    const herdClose = await herdShot(true);
    const herdRts = await herdShot(false);
    await sharp({ create: { width: 1400, height: 394, channels: 3, background: '#141414' } })
      .composite([
        { input: herdClose, left: 0, top: 0 },
        { input: herdRts, left: 700, top: 0 },
      ])
      .webp({ quality: 82 })
      .toFile(`${out}-herd.webp`);
    console.log(`wrote ${path.relative(process.cwd(), `${out}-herd.webp`)}`);
  } finally {
    await herdContext.close();
  }
} finally {
  await browser.close();
  await close();
}
