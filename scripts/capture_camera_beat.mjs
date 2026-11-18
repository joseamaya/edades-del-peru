import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { launchChromium, withViteServer, cliArg, reviewDir } from './lib.mjs';

/**
 * Evidence animation for a mid-mission camera beat: the camera starts a non-opening flight to the
 * left and the player holds D after 0.25 s. A fix makes the beat yield and the camera pan right; the
 * old code keeps the scripted flight. Fixed 1/60 s steps, so the capture is deterministic.
 *
 * Usage: node scripts/capture_camera_beat.mjs [--tag=after] [--frames=50] [--width=800]
 * Writes review/camera-beat-<tag>-last.png and the animated WebP docs/media/camera-beat-<tag>.webp.
 * For the before pair, copy this script into a worktree at origin/main and run --tag=before there.
 */
const tag = cliArg('tag', 'after');
const frames = Number.parseInt(cliArg('frames', '50'), 10);
const width = Number.parseInt(cliArg('width', '800'), 10);
const out = path.resolve(cliArg('out', `docs/media/camera-beat-${tag}.webp`));
const frameDir = path.join(reviewDir(), `camera-beat-frames-${tag}`);

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
      const centre = g.settings.mapSize / 2;
      g.camera.follow(null);
      g.camera.moveTo(centre, centre, true);
      g.camera.setHeight(40);
      for (let i = 0; i < 90; i++) g.camera.update(1 / 60, i / 60);
      // Fly left; the player will ask to go right with D.
      g.camera.flyTo(centre - 80, centre, 40, 2, false);
      g.camera.camera.updateMatrixWorld();
      g.renderer.render(g.scene, g.camera.camera);
    });

    for (let i = 0; i < frames; i++) {
      await page.evaluate(
        ({ step }) => {
          const g = window.game;
          if (step === 15) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
          if (step === 45) window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
          g.update(1 / 60, step / 60);
          g.camera.camera.updateMatrixWorld();
          g.renderer.render(g.scene, g.camera.camera);
        },
        { step: i },
      );
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
    const still = path.join(reviewDir(), `camera-beat-${tag}-last.png`);
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
