import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Capture the household dressing of the five cultures added in P2-4 (Chimú, Chanca, Paracas, Recuay,
 * Tiahuanaco) on their own start base, plus a Chimú before/after pair with the props hidden and shown.
 *
 * Usage: node scripts/capture_dressing_cultures.mjs [--out=docs/media/dressing-cultures]
 */
const CULTURES = [
  { civ: 'chimu', period: 4, label: 'Chimú' },
  { civ: 'chanca', period: 4, label: 'Chanca' },
  { civ: 'paracas', period: 2, label: 'Paracas' },
  { civ: 'recuay', period: 2, label: 'Recuay' },
  { civ: 'tiahuanaco', period: 3, label: 'Tiahuanaco' },
];
const out = path.resolve(cliArg('out', path.join(reviewDir(), 'dressing-cultures')));
fs.mkdirSync(path.dirname(out), { recursive: true });

const { base, close } = await withViteServer();
const browser = await launchChromium();
const shots = [];
try {
  for (const culture of CULTURES) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => console.log('PAGEERROR', culture.civ, error.message));
    try {
      const url = `${base}/?play=1&civ=${culture.civ}&period=${culture.period}&seed=777&intro=0&fog=0&low=0`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
      await page.waitForFunction(() => window.game.settlementDressing?.[0]?.attached === true, null, {
        timeout: 60_000,
        polling: 500,
      });
      const framed = await page.evaluate(() => {
        const g = window.game;
        g.loop.stop();
        const ui = document.getElementById('ui-root');
        if (ui) ui.style.display = 'none';
        const labels = document.getElementById('ed-world-labels');
        if (labels) labels.style.display = 'none';
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
        const dressing = g.settlementDressing[0];
        const target =
          dressing.placements.find((p) => p.kind === 'drying_rack') ??
          dressing.placements.find((p) => p.kind === 'cotton') ??
          dressing.placements[0];
        const cam = g.camera.camera;
        const y = g.terrain.getHeight(target.x, target.z);
        cam.position.set(target.x + 3.2, y + 3.0, target.z + 4.6);
        cam.lookAt(target.x, y + 0.45, target.z);
        g.renderer.render(g.scene, cam);
        return { x: target.x, z: target.z, props: dressing.placements.length, kind: target.kind };
      });
      await page.waitForTimeout(250);
      const after = await sharp(await page.screenshot({ type: 'png' }))
        .resize(640, 360)
        .toBuffer();
      shots.push({ ...culture, ...framed, image: after });
      console.log(culture.civ, `${framed.props} props, framed ${framed.kind}`);

      if (culture.civ === 'chimu') {
        await page.evaluate(() => {
          const g = window.game;
          g.settlementDressing[0].group.visible = false;
          const dressing = g.settlementDressing[0];
          const target =
            dressing.placements.find((p) => p.kind === 'drying_rack') ??
            dressing.placements.find((p) => p.kind === 'cotton') ??
            dressing.placements[0];
          const cam = g.camera.camera;
          const y = g.terrain.getHeight(target.x, target.z);
          cam.position.set(target.x + 3.2, y + 3.0, target.z + 4.6);
          cam.lookAt(target.x, y + 0.45, target.z);
          g.renderer.render(g.scene, cam);
        });
        await page.waitForTimeout(180);
        const before = await sharp(await page.screenshot({ type: 'png' }))
          .resize(640, 360)
          .toBuffer();
        await sharp({ create: { width: 1280, height: 360, channels: 3, background: '#141414' } })
          .composite([
            { input: before, left: 0, top: 0 },
            { input: after, left: 640, top: 0 },
          ])
          .webp({ quality: 82 })
          .toFile(`${out}-chimu-before-after.webp`);
        console.log(`wrote ${path.relative(process.cwd(), `${out}-chimu-before-after.webp`)}`);
      }
    } finally {
      await context.close();
    }
  }
  // 3 + 2 grid (1920 x 720): the five culture bases.
  await sharp({ create: { width: 1920, height: 720, channels: 3, background: '#141414' } })
    .composite(
      shots.map((shot, index) => ({ input: shot.image, left: (index % 3) * 640, top: Math.floor(index / 3) * 360 })),
    )
    .webp({ quality: 82 })
    .toFile(`${out}.webp`);
  console.log(`wrote ${path.relative(process.cwd(), `${out}.webp`)} (${shots.length} cultures)`);
} finally {
  await browser.close();
  await close();
}
