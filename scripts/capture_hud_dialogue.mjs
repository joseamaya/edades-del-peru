import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

/**
 * Evidence for the HUD pass: the dialogue dock and the large-screen scale at 1280x720 and 1920x1080.
 * Usage: node scripts/capture_hud_dialogue.mjs
 * Writes review/hud-<size>.png and the 960x540 WebP copies under docs/media/.
 */
const SIZES = [
  [1280, 720],
  [1600, 900],
  [1920, 1080],
];

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const out = reviewDir();
  for (const [width, height] of SIZES) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(base + '/?mission=m_tambotoco&seed=777&fog=0&low=1&intro=0', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 30_000 });
    await page
      .getByRole('button', { name: /COMENZAR MISIÓN/ })
      .click()
      .catch(() => {});
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const g = window.game;
      g.hud.showDialogue(
        'Mama Huaco',
        'La tradición cuenta que Mama Huaco mató a un hualla y los huallas huyeron; los recién llegados tomaron sus tierras y fundaron Inticancha en el valle.',
        30,
        'mama_huaco',
      );
      g.selectUnits([...g.units.values()].filter((u) => u.owner === 0 && !u.dead).map((u) => u.id));
    });
    await page.waitForTimeout(1200);
    const png = path.join(out, `hud-${width}x${height}.png`);
    await page.screenshot({ path: png });
    console.log(png);
    const webp = path.join(path.resolve('docs/media'), `tambotoco-hud-${width}.webp`);
    // Native size: a downscaled 1920 shot would look smaller than the 1280 one and prove nothing.
    await sharp(png).webp({ quality: 72 }).toFile(webp);
    console.log(webp);
    await page.close();
  }
  await browser.close();
  await close();
}

await main();
