import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, reviewDir, cliArg } from './lib.mjs';

/**
 * Capture game screenshots for the subagent visual review.
 * Usage: node scripts/screenshot.mjs [name] [--url=...] [--wait=ms] [--seed=...] [--click] [--site] [--height=N]
 * `--click` presses the first `.ed-primary` button (the mission briefing's start) before the wait.
 * `--site` flies the camera over the mission's authored site anchor (useful for site-view evidence),
 * `--height=N` overrides the camera zoom of that framing (default 78, the map-wide isometric limit) and
 * `--no-hud` hides the DOM HUD so a capture shows the terrain and the site alone.
 * `--no-labels` also hides the in-world place names, so a blind-test sheet cannot give the mission away.
 */
const name = process.argv[2] ?? 'default';
const urlArg = cliArg('url');
const wait = parseInt(cliArg('wait', '6000'), 10);
const clickStart = process.argv.includes('--click');
const siteView = process.argv.includes('--site');
const noHud = process.argv.includes('--no-hud');
const noLabels = process.argv.includes('--no-labels');
const siteHeight = Number.parseFloat(cliArg('height', '78'));
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

  const url = urlArg ? (urlArg.startsWith('/') ? base + urlArg : urlArg) : base + `/?seed=${seed}&fog=0&low=1`;

  await page.goto(url, { waitUntil: 'networkidle' });
  // wait for the game to be ready
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30000 }).catch(() => {});
  if (clickStart) {
    await page
      .locator('.ed-primary')
      .first()
      .click({ timeout: 3000 })
      .catch(() => {});
  }
  await page.waitForTimeout(wait);
  if (noHud) {
    await page.evaluate(() => {
      const root = document.getElementById('ui-root');
      if (root) root.style.display = 'none';
    });
  }
  if (noLabels) {
    await page.evaluate(() => {
      // The layer re-shows each label every frame, so hide the container, not the label nodes.
      const layer = document.getElementById('ed-world-labels');
      if (layer) layer.style.display = 'none';
    });
  }
  if (siteView) {
    await page
      .evaluate(
        ([height]) => {
          const g = window.game;
          const anchor = g?.siteDef?.anchor;
          if (!anchor) return;
          g.camera.flyTo(anchor.x, anchor.z, height, 0.6, true);
        },
        [siteHeight],
      )
      .catch((e) => errors.push('SITE-VIEW: ' + e.message));
    await page.waitForTimeout(2500);
  }

  const files = [];
  for (let i = 0; i < numShots; i++) {
    const fn = `${name}_${i}.png`;
    const fp = path.join(outDir, fn);
    await page.screenshot({ path: fp });
    files.push(fp);
    if (i < numShots - 1) await page.waitForTimeout(1500);
  }

  // eval state summary
  const summary = await page
    .evaluate(() => {
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
    })
    .catch((e) => 'eval-error:' + e.message);

  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ url, summary, files, errors }, null, 2));

  await browser.close();
  await close();
  console.log(JSON.stringify({ summary, files, errors }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
