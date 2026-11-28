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

/** A caption bar over a 640x360 tile, so the sheet says which culture each panel shows. */
async function labelled(image, text) {
  const svg = Buffer.from(
    `<svg width="640" height="44"><rect width="640" height="44" fill="#0d0d0dcc"/>` +
      `<text x="14" y="29" font-family="sans-serif" font-size="20" fill="#f4efe6">${text}</text></svg>`,
  );
  return sharp(image)
    .composite([{ input: svg, top: 0, left: 0 }])
    .toBuffer();
}

const frameCode = (targetExpr) => `(() => {
  const g = window.game;
  const p = ${targetExpr};
  const y = g.terrain.getHeight(p.x, p.z);
  const cam = g.camera.camera;
  cam.position.set(p.x + 1.6, y + 8.5, p.z + 2.2);
  cam.lookAt(p.x, y + 0.3, p.z);
  g.renderer.render(g.scene, cam);
})()`;

const TARGET = `(() => {
  const dressing = window.game.settlementDressing[0];
  return (
    dressing.placements.find((p) => p.kind === 'drying_rack') ??
    dressing.placements.find((p) => p.kind === 'cotton') ??
    dressing.placements.find((p) => p.kind === 'bench') ??
    dressing.placements.find((p) => p.kind === 'basket') ??
    dressing.placements[0]
  );
})()`;

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
      const framed = await page.evaluate(`(() => {
        const g = window.game;
        g.loop.stop();
        for (const id of ['ui-root', 'ed-world-labels']) document.getElementById(id)?.style.setProperty('display', 'none');
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
        const target = ${TARGET};
        ${frameCode('target')}
        return { x: target.x, z: target.z, kind: target.kind, props: g.settlementDressing[0].placements.length };
      })()`);
      await page.waitForTimeout(250);
      const after = await labelled(
        await sharp(await page.screenshot({ type: 'png' }))
          .resize(640, 360)
          .toBuffer(),
        `${culture.label} · ${framed.kind.replace('_', ' ')}`,
      );
      shots.push({ ...culture, ...framed, image: after });
      console.log(culture.civ, `${framed.props} props, framed ${framed.kind}`);

      if (culture.civ === 'chimu') {
        await page.evaluate(`(() => {
          const g = window.game;
          g.settlementDressing[0].group.visible = false;
          ${frameCode(JSON.stringify({ x: framed.x, z: framed.z }))}
        })()`);
        await page.waitForTimeout(180);
        const before = await labelled(
          await sharp(await page.screenshot({ type: 'png' }))
            .resize(640, 360)
            .toBuffer(),
          'Chimú · sin props',
        );
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
  // 3 + 2 grid (1920 x 720) with a legend in the sixth cell.
  const legend = Buffer.from(
    `<svg width="640" height="360"><rect width="640" height="360" fill="#141414"/>` +
      `<text x="40" y="120" font-family="sans-serif" font-size="34" fill="#f4efe6">P2-4 · cinco culturas</text>` +
      `<text x="40" y="168" font-family="sans-serif" font-size="22" fill="#c9c1b4">Chimú · Chanca · Paracas</text>` +
      `<text x="40" y="200" font-family="sans-serif" font-size="22" fill="#c9c1b4">Recuay · Tiahuanaco</text>` +
      `<text x="40" y="268" font-family="sans-serif" font-size="17" fill="#8f877b">yarn capture:dressing</text></svg>`,
  );
  await sharp({ create: { width: 1920, height: 720, channels: 3, background: '#141414' } })
    .composite([
      ...shots.map((shot, index) => ({ input: shot.image, left: (index % 3) * 640, top: Math.floor(index / 3) * 360 })),
      { input: legend, left: 1280, top: 360 },
    ])
    .webp({ quality: 82 })
    .toFile(`${out}.webp`);
  console.log(`wrote ${path.relative(process.cwd(), `${out}.webp`)} (${shots.length} cultures)`);
} finally {
  await browser.close();
  await close();
}
