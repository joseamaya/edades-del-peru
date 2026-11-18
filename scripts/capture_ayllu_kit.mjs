import path from 'path';
import { launchChromium, withViteServer, reviewDir, cliArg } from './lib.mjs';

/**
 * Evidence captures for the Tambotoco ayllu kit (`src/rendering/aylluKit.ts`).
 * Usage: node scripts/capture_ayllu_kit.mjs [--tag=after] [--mission=m_tambotoco]
 * Writes review/ayllu-<tag>-{cave,shrine,hualla,inticancha,valley}.png at 1600x900 with the HUD hidden
 * and the site at its final `fundada` phase.
 */
const tag = cliArg('tag', 'after');
const mission = cliArg('mission', 'm_tambotoco');
const views = [
  { name: 'cave', x: 40, z: 55, h: 24 },
  { name: 'shrine', x: 120, z: 106, h: 40 },
  { name: 'hualla', x: 136, z: 166, h: 24 },
  { name: 'inticancha', x: 168, z: 190, h: 34 },
  { name: 'valley', x: 160, z: 155, h: 58 },
];

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(base + `/?mission=${mission}&seed=777&fog=0&low=1&intro=0`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 30_000 });
  await page
    .locator('.ed-primary')
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  await page.addStyleTag({ content: '#ui-root { display: none !important; }' });
  await page.evaluate(() => window.game.setSitePhase('fundada'));
  await page.waitForTimeout(1200);
  for (const view of views) {
    await page.evaluate(({ x, z, h }) => {
      const g = window.game;
      g.camera.follow(null);
      g.camera.moveTo(x, z, true);
      g.camera.setHeight(h);
    }, view);
    await page.waitForTimeout(1800);
    const file = path.join(reviewDir(), `ayllu-${tag}-${view.name}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 8));
  await browser.close();
  await close();
}

await main();
