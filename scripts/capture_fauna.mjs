import fs from 'node:fs';
import path from 'node:path';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Capture the hunt herds by biome and the caravan pack.
 * Usage: node scripts/capture_fauna.mjs [--scene=coast-hunt,andes-hunt,jungle-hunt,caravan] [--gpu]
 *
 * Each scene opens the real mission, focuses the first live hunt node (or spawns a
 * caravan), hides the HUD and writes review/fauna-<scene>.png + a JSON summary.
 */
const SCENES = {
  'coast-hunt': { mission: 'm_lima', seed: 1535 },
  'andes-hunt': { mission: 'm7_tupac_amaru', seed: 1780 },
  'jungle-hunt': { mission: 'm_vilcabamba', seed: 1572 },
  caravan: { mission: 'm7_tupac_amaru', seed: 1780 },
};
const wanted = cliArg('scene', Object.keys(SCENES).join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
for (const name of wanted) if (!SCENES[name]) throw new Error(`unknown scene ${name}`);

const out = reviewDir();

async function openMission(browser, base, mission, seed) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.goto(base + `/?play=1&mission=${mission}&seed=${seed}&intro=0&fog=0&low=0`, {
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
  await page.waitForTimeout(1400);
  await page.addStyleTag({ content: '#ui-root { display: none !important; }' });
  return { context, page, errors };
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const results = [];
  try {
    for (const scene of wanted) {
      const def = SCENES[scene];
      const { context, page, errors } = await openMission(browser, base, def.mission, def.seed);
      try {
        const state = await page.evaluate((sceneName) => {
          const g = window.game;
          g.camera.follow(null);
          if (sceneName === 'caravan') {
            const c = g.playerCenter(0);
            // Open ground away from the base trees and centre the alpaca.
            const unit = g.spawnScriptedUnit('caravan', 0, c.x + 42, c.z + 4);
            g.camera.moveTo(unit.pos.x, unit.pos.z, true);
            g.camera.setHeight(28);
            const view = unit.unitView;
            return {
              x: unit.pos.x,
              z: unit.pos.z,
              variant: view?.rig?.variantId ?? null,
              pack: !!view?.rig?.root.getObjectByName('attire_caravan_pack'),
              mapType: g.settings.mapType,
            };
          }
          const node = [...g.resourceNodes.values()].find((n) => n.kind === 'hunt' && !n.dead);
          if (!node) return { error: 'no live hunt node' };
          g.camera.moveTo(node.pos.x, node.pos.z, true);
          g.camera.setHeight(28);
          const herd = node.nodeView?.view.getObjectByName('hunt_herd');
          const bodies = herd?.getObjectByName('hunt_bodies');
          return {
            x: node.pos.x,
            z: node.pos.z,
            mapType: g.settings.mapType,
            bodies: bodies?.count ?? null,
            herd: !!herd,
          };
        }, scene);
        await page.waitForTimeout(1200);
        const file = path.join(out, `fauna-${scene}.png`);
        await page.screenshot({ path: file });
        results.push({ scene, ...def, state, file, errors });
        console.log(file, JSON.stringify(state));
        if (state.error || errors.length) process.exitCode = 1;
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await close();
  }
  const summary = path.join(out, 'fauna-capture.json');
  fs.writeFileSync(summary, JSON.stringify(results, null, 2));
  console.log(summary);
}

await main();
