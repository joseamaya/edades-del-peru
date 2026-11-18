import fs from 'node:fs';
import path from 'node:path';
import { bootMatch, cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

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

    await bootMatch(page, base + '/?play=1&mission=m7_tupac_amaru&seed=1780&fog=0&low=0&intro=0');
    await page.waitForFunction(
      () => window.__modelAssets?.().find((a) => a.id === 'mounted_rig')?.state === 'ready',
      null,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(1200);

    const spawn = await page.evaluate(() => {
      const g = window.game;
      const c = g.playerCenter(0);
      // Open ground away from the player base so the enemy pair does not join a
      // fight and the close-up is not blocked by trees.
      const x = c.x + 42;
      const z = c.z + 4;
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

    // Motion proof: a normal move must trot (campaign speed is below the gallop
    // threshold) while an attack order must charge and play the gallop.
    const motion = await page.evaluate(() => {
      const g = window.game;
      const c = g.playerCenter(0);
      const trot = g.spawnScriptedUnit('cavalry', 0, c.x - 30, c.z + 16);
      trot.issueOrder({ kind: 'move', target: { x: trot.pos.x + 24, z: trot.pos.z } });
      const gallop = g.spawnScriptedUnit('cavalry', 0, c.x - 30, c.z + 10);
      gallop.issueOrder({ kind: 'attack_move', target: { x: gallop.pos.x + 24, z: gallop.pos.z } });
      return { trot: trot.id, gallop: gallop.id, speeds: [trot.stats.speed, gallop.stats.speed] };
    });
    await page.waitForTimeout(1200);
    const readState = async (id) =>
      page.evaluate(
        ({ id }) => {
          const unit = window.game.units.get(id);
          const view = unit?.unitView;
          return {
            state: view?.rig?.currentState ?? null,
            clip: view?.rig?.currentClipName ?? null,
            speed: Math.hypot(unit?.vel.x ?? 0, unit?.vel.z ?? 0),
          };
        },
        { id },
      );
    const states = { trot: await readState(motion.trot), gallop: await readState(motion.gallop) };
    for (const name of ['trot', 'gallop']) {
      await page.evaluate(
        ({ id }) => {
          const g = window.game;
          const unit = g.units.get(id);
          if (!unit) return;
          g.camera.follow(null);
          g.camera.moveTo(unit.pos.x, unit.pos.z, true);
          g.camera.setHeight(24);
        },
        { id: motion[name] },
      );
      await page.waitForTimeout(250);
      const file = path.join(out, `mounted-model-${tag}-${name}.png`);
      await page.screenshot({ path: file });
      files.push(file);
    }

    const summary = path.join(out, `mounted-model-${tag}.json`);
    fs.writeFileSync(summary, JSON.stringify({ tag, url: page.url(), spawn, motion, states, files, errors }, null, 2));
    console.log(JSON.stringify({ spawn, motion, states, files, errors }, null, 2));
    if (errors.length || !states.trot.state || !states.gallop.state) process.exitCode = 1;
  } finally {
    await browser.close();
    await close();
  }
}

await main();
