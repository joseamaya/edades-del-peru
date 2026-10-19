import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { launchChromium, withViteServer, cliArg, reviewDir } from './lib.mjs';

/**
 * Capture a short, cinematic gameplay GIF (mission intro flyover) with ffmpeg.
 * Usage: `yarn gif [--mission=m1_caral] [--frames=12] [--width=800]`.
 * Regenerate on a real GPU for a smoother result — software rendering is slow.
 */
const mission = cliArg('mission', 'm1_caral');
const out = path.resolve(cliArg('out', 'docs/media/gameplay.gif'));
const frames = Number.parseInt(cliArg('frames', '12'), 10);
const interval = Number.parseInt(cliArg('interval', '220'), 10);
const width = Number.parseInt(cliArg('width', '800'), 10);
const frameDir = path.join(reviewDir(), 'gif_frames');

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1000, height: 620 } });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));

    fs.rmSync(frameDir, { recursive: true, force: true });
    fs.mkdirSync(frameDir, { recursive: true });
    await page.goto(`${base}/?play=1&mission=${mission}&seed=777&fog=0&cine=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /COMENZAR MISIÓN|Comenzar|Empezar/i.test(b.textContent ?? ''),
      );
      if (btn) btn.click();
    });

    for (let i = 0; i < frames; i++) {
      await page.screenshot({
        path: path.join(frameDir, `frame_${String(i).padStart(3, '0')}.jpg`),
        type: 'jpeg',
        quality: 82,
      });
      console.log(`[gif] frame ${i + 1}/${frames}`);
      await page.waitForTimeout(interval);
    }

    fs.mkdirSync(path.dirname(out), { recursive: true });
    const filter =
      `scale=${width}:-1:flags=lanczos,split[s0][s1];` +
      '[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3';
    try {
      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-loglevel',
          'error',
          '-framerate',
          String(Math.max(2, Math.round(1000 / interval))),
          '-i',
          path.join(frameDir, 'frame_%03d.jpg'),
          '-vf',
          filter,
          '-loop',
          '0',
          out,
        ],
        { stdio: 'inherit' },
      );
    } catch (e) {
      if (e && e.code === 'ENOENT') {
        console.error('[gif] ffmpeg was not found; install ffmpeg to build the GIF');
        return 1;
      }
      throw e;
    }
    const kb = (fs.statSync(out).size / 1024).toFixed(0);
    if (errors.length) {
      console.error(`[gif] page errors: ${errors.slice(0, 2).join(' | ')}`);
      return 1;
    }
    console.log(`[gif] ${out} (${kb} KB, ${frames} frames)`);
    return 0;
  } finally {
    await browser.close();
    await close();
    fs.rmSync(frameDir, { recursive: true, force: true });
  }
}

process.exit(await main());
