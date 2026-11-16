import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, reviewDir, cliArg } from './lib.mjs';

/**
 * Evidence captures for the shadow pass (VSM -> PCFSoft and the rig silhouette rule).
 * Usage: node scripts/capture_shadow_pass.mjs [--tag=after]
 * Writes review/shadow-<tag>-{opening,close}.png at 1600x900, high quality, the bench framing, and the
 * 960x540 WebP copies under docs/media/. Run it on `main` with `--tag=before` to reproduce the old VSM
 * pair; the committed `m8-shadow-before.webp` was taken that way.
 */
const tag = cliArg('tag', 'after');
const WEBP_DIR = path.resolve('docs/media');
const VIEWS = [
  { name: 'opening', height: 54 },
  { name: 'close', height: 22 },
];

async function publish(png, name) {
  const webp = path.join(WEBP_DIR, name);
  await sharp(png).resize(960, 540).webp({ quality: 58 }).toFile(webp);
  console.log(webp);
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/?mission=m8_independencia&intro=0&fog=0&seed=777', { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () =>
      !!window.game?.landmark?.getObjectByName('independence_site') &&
      (window.game.settlementDressing ?? []).every((d) => d.attached !== false),
    null,
    { timeout: 90_000 },
  );
  await page
    .locator('.ed-primary')
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  for (const view of VIEWS) {
    const png = path.join(reviewDir(), `shadow-${tag}-${view.name}.png`);
    await page.evaluate((height) => {
      const g = window.game;
      g.qualityGovernor.setUserQuality('high');
      g.qualityGovernor.update = () => {};
      g.trees.kitLod0Radius = 45;
      const p = g.playerCenter(0);
      g.camera.moveTo(p.x, p.z, true);
      g.camera.setHeight(height);
      const focus = g.camera.getTarget();
      g.trees.update(0, focus);
      g.quarries?.update(focus);
      g.pacae?.update(focus);
      g.siteCrew?.update(0, focus);
      for (const d of g.settlementDressing ?? []) d.update(focus);
      for (let i = 0; i < 120; i++) g.camera.update(1 / 30, i / 30);
      g.camera.camera.updateMatrixWorld();
      g.terrain.updateLod(g.camera.camera.position, true);
      g.runtime.frameShadows();
      g.loop.stop();
      for (let i = 0; i < 3; i++) {
        g.runtime.frameShadows();
        g.renderer.render(g.scene, g.camera.camera);
      }
    }, view.height);
    await page.waitForTimeout(300);
    await page.screenshot({ path: png });
    console.log(png);
    await publish(png, `m8-shadow-${tag}-${view.name}.webp`);
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 8));
  await browser.close();
  await close();
}

await main();
