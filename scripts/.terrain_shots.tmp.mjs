import path from 'path';
import { launchChromium, withViteServer } from './lib.mjs';
const out = process.argv[2];
const shots = [
  ['coast', '?play=1&seed=777&fog=0&intro=0&map=coast&period=4'],
  ['andes', '?play=1&seed=777&fog=0&intro=0&map=andes&period=7'],
  ['altiplano', '?play=1&seed=777&fog=0&intro=0&map=altiplano&period=5'],
  ['jungle', '?play=1&seed=777&fog=0&intro=0&map=jungle&period=7'],
  ['caral', '?play=1&seed=777&fog=0&intro=0&mission=m1_caral'],
];
const { base, close } = await withViteServer();
const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
for (const [name, q] of shots) {
  const page = await ctx.newPage();
  await page.goto(base + '/' + q, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(7000);
  await page.screenshot({ path: path.join(out, name + '.png') });
  // close-up: zoom camera in
  await page.evaluate(() => { const c = window.game?.cameraCtl ?? window.game?.cam; if (c?.setZoom) c.setZoom(c.minZoom ?? 20); });
  await page.mouse.move(800, 450);
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -400); await page.waitForTimeout(120); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, name + '_close.png') });
  await page.close();
}
await browser.close(); await close();
