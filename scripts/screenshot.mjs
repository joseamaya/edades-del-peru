import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, reviewDir, cliArg } from './lib.mjs';

/**
 * Capture game screenshots for the subagent visual review.
 * Usage: node scripts/screenshot.mjs [name] [--url=...] [--wait=ms] [--seed=...]
 */
const name = process.argv[2] ?? 'default';
const urlArg = cliArg('url');
const wait = parseInt(cliArg('wait', '6000'), 10);
const seed = parseInt(cliArg('seed', '12345'), 10);
const numShots = parseInt(cliArg('shots', '1'), 10);

const outDir = reviewDir();

async function main() {
  const { base, close } = await withViteServer();

  const browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
  });

  const url = urlArg ?? base + `/?seed=${seed}&fog=0&low=1`;

  await page.goto(url, { waitUntil: 'networkidle' });
  // wait for the game to be ready
  await page.waitForFunction(() => (window).game !== undefined, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(wait);

  const files = [];
  for (let i = 0; i < numShots; i++) {
    const fn = `${name}_${i}.png`;
    const fp = path.join(outDir, fn);
    await page.screenshot({ path: fp });
    files.push(fp);
    if (i < numShots - 1) await page.waitForTimeout(1500);
  }

  // eval state summary
  const summary = await page.evaluate(() => {
    const g = window.game;
    if (!g) return 'no-game';
    const p = g.players?.[0];
    return {
      era: p?.era ?? -1,
      units: g.units?.size ?? 0,
      buildings: g.buildings?.size ?? 0,
      fps: g.loop?.getFps?.(),
      res: p?.resources,
    };
  }).catch((e) => 'eval-error:' + e.message);

  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ summary, files, errors }, null, 2));

  await browser.close();
  await close();
  console.log(JSON.stringify({ summary, files, errors }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
