import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { launchChromium, withViteServer, cliArg, reviewDir } from './lib.mjs';

/**
 * Evidence GIF for the edge-scroll band. The game loop is stopped and the camera is driven with
 * fixed 1/60 s steps, so the capture is deterministic and shows the same travel on any GPU.
 *
 * Usage: node scripts/capture_camera_pan.mjs [--tag=after] [--frames=40] [--width=800]
 * Writes review/camera-edge-<tag>-last.png and the animated WebP docs/media/camera-edge-<tag>.webp.
 * For the committed before pair, run the same script from a worktree at the pre-fix commit (origin/main);
 * camera-edge-before.webp was captured that way.
 */
const tag = cliArg('tag', 'after');
const frames = Number.parseInt(cliArg('frames', '40'), 10);
const width = Number.parseInt(cliArg('width', '800'), 10);
const out = path.resolve(cliArg('out', `docs/media/camera-edge-${tag}.webp`));
const frameDir = path.join(reviewDir(), `camera-edge-frames-${tag}`);

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));

    fs.rmSync(frameDir, { recursive: true, force: true });
    fs.mkdirSync(frameDir, { recursive: true });
    await page.goto(`${base}/?play=1&seed=777&fog=0&low=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 30_000 });
    await page.waitForTimeout(1200);

    await page.evaluate(() => {
      const g = window.game;
      g.loop.stop();
      if (g.getPaused()) g.togglePause();
      g.camera.follow(null);
      g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
      g.camera.setHeight(40);
      for (let i = 0; i < 90; i++) g.camera.update(1 / 60, i / 60);
      // 9 px from the right edge: inside the band, but far from the old full-speed pixel.
      g.camera.updateMouse(window.innerWidth - 9, Math.round(window.innerHeight / 2));
      g.camera.camera.updateMatrixWorld();
      g.renderer.render(g.scene, g.camera.camera);
    });

    for (let i = 0; i < frames; i++) {
      await page.evaluate((step) => {
        const g = window.game;
        g.update(1 / 60, step / 60);
        g.camera.camera.updateMatrixWorld();
        g.renderer.render(g.scene, g.camera.camera);
      }, i);
      await page.screenshot({
        path: path.join(frameDir, `frame_${String(i).padStart(3, '0')}.jpg`),
        type: 'jpeg',
        quality: 82,
      });
    }

    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-framerate',
        '20',
        '-i',
        path.join(frameDir, 'frame_%03d.jpg'),
        '-vf',
        `scale=${width}:-1:flags=lanczos`,
        '-c:v',
        'libwebp_anim',
        '-quality',
        '60',
        '-compression_level',
        '6',
        '-loop',
        '0',
        out,
      ],
      { stdio: 'inherit' },
    );
    const still = path.join(reviewDir(), `camera-edge-${tag}-last.png`);
    await page.screenshot({ path: still });
    console.log(`${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${frames} frames)`);
    console.log(still);
    if (errors.length) {
      console.error(`page errors: ${errors.slice(0, 2).join(' | ')}`);
      return 1;
    }
    return 0;
  } finally {
    await browser.close();
    await close();
    fs.rmSync(frameDir, { recursive: true, force: true });
  }
}

process.exit(await main());
