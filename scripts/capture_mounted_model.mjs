import fs from 'node:fs';
import path from 'node:path';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Capture the mounted cavalry model in its mission context (m7, 1780).
 * Usage: node scripts/capture_mounted_model.mjs [--tag=before|after] [--gpu]
 *
 * Spawns two Realista dragons in an open area of the m7 map, then captures the
 * pair at the art-direction close/default/wide camera heights plus a HUD frame.
 * Writes review/mounted-model-<tag>-*.png and a JSON summary.
 */
const tag = cliArg('tag', 'after');
const out = reviewDir();

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const errors = [];
  const files = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });

    await page.goto(base + '/?play=1&mission=m7_tupac_amaru&seed=1780&fog=0&low=0&intro=0', {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 30_000 });
    await page
      .locator('.ed-primary')
      .first()
      .click({ timeout: 3000 })
      .catch(() => {});
    await page
      .getByRole('button', { name: /omitir tutorial/i })
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.waitForFunction(
      () => window.__modelAssets?.().find((a) => a.id === 'mounted_rig')?.state === 'ready',
      null,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(1200);

    const spawn = await page.evaluate(() => {
      const g = window.game;
      const c = g.playerCenter(0);
      const x = c.x + 14;
      const z = c.z + 12;
      const first = g.spawnScriptedUnit('realista_dragon', 1, x - 2.2, z);
      const second = g.spawnScriptedUnit('realista_dragon', 1, x + 2.2, z);
      g.camera.follow(null);
      g.camera.moveTo(x, z, true);
      g.camera.setHeight(54);
      return { x, z, first: first.id, second: second.id, units: g.units.size };
    });
    await page.waitForTimeout(1800);

    const hud = path.join(out, `mounted-model-${tag}-hud.png`);
    await page.screenshot({ path: hud });
    files.push(hud);

    await page.addStyleTag({ content: '#ui-root { display: none !important; }' });
    const views = [
      { name: 'close', height: 28 },
      { name: 'default', height: 54 },
      { name: 'wide', height: 90 },
    ];
    for (const view of views) {
      await page.evaluate(
        ({ x, z, height }) => {
          const g = window.game;
          g.camera.follow(null);
          g.camera.moveTo(x, z, true);
          g.camera.setHeight(height);
        },
        { ...spawn, height: view.height },
      );
      await page.waitForTimeout(1400);
      const file = path.join(out, `mounted-model-${tag}-${view.name}.png`);
      await page.screenshot({ path: file });
      files.push(file);
    }

    // Motion proof: order the first dragon to move and read the rig's live state.
    const motion = await page.evaluate(() => {
      const g = window.game;
      const c = g.playerCenter(0);
      const unit = g.spawnScriptedUnit('cavalry', 0, c.x + 12, c.z + 6);
      unit.issueOrder({ kind: 'move', target: { x: unit.pos.x + 24, z: unit.pos.z + 6 } });
      g.camera.follow(unit);
      g.camera.setHeight(38);
      return { id: unit.id, speed: unit.stats.speed };
    });
    await page.waitForTimeout(1400);
    const state = await page.evaluate(({ id }) => {
      const unit = window.game.units.get(id);
      const view = unit?.unitView;
      return {
        state: view?.rig?.currentState ?? null,
        clip: view?.rig?.currentClipName ?? null,
        speed: Math.hypot(unit?.vel.x ?? 0, unit?.vel.z ?? 0),
      };
    }, motion);
    const gallop = path.join(out, `mounted-model-${tag}-gallop.png`);
    await page.screenshot({ path: gallop });
    files.push(gallop);

    const summary = path.join(out, `mounted-model-${tag}.json`);
    fs.writeFileSync(summary, JSON.stringify({ tag, url: page.url(), spawn, motion, state, files, errors }, null, 2));
    console.log(JSON.stringify({ spawn, motion, state, files, errors }, null, 2));
  } finally {
    await browser.close();
    await close();
  }
}

await main();
