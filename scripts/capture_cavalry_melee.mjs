import fs from 'fs';
import path from 'path';
import { cliArg, launchChromium, withViteServer } from './lib.mjs';

/**
 * Debug capture for stop-and-fight separation: ten realista dragons ordered onto five soldiers, with
 * fourteen soldiers in the line. Same seed, light, camera and update count on both sides of the change.
 *
 * Usage:
 *   node scripts/capture_cavalry_melee.mjs --out=review/cavalry-after
 *
 * The before set is produced by running the same script from a worktree at `main`.
 */
const OUT = path.resolve(cliArg('out', 'review/cavalry'));
const SECONDS = Number.parseFloat(cliArg('seconds', '6'));
fs.mkdirSync(OUT, { recursive: true });

const { base, close } = await withViteServer({ optimizeDeps: { noDiscovery: true } });
const browser = await launchChromium();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  try {
    await page.goto(base + '/?play=1&seed=777&fog=0&low=1&noloop=1&period=7&civ=realistas', {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.game?.players?.length > 0, null, { timeout: 30_000 });
    await page.evaluate((seconds) => {
      const g = window.game;
      g.loop.stop();
      g.ais.length = 0;
      g.settings.timeOfDay = 'noon';
      g.sky.setTimeOfDay(0.5);
      g.sky.update(0);
      const ui = document.getElementById('ui-root');
      if (ui) ui.style.display = 'none';

      const base = g.findLandNear(g.playerCenter(0).x + 14, g.playerCenter(0).z + 14, 28);
      const dragons = [];
      const soldiers = [];
      for (let i = 0; i < 10; i++) {
        const dragon = g.spawnScriptedUnit('realista_dragon', 0, base.x - 6 + i * 1.25, base.z);
        dragon.hp = dragon.maxHp = 100_000;
        dragon.setCombatStance('agresivo');
        dragons.push(dragon);
      }
      for (let i = 0; i < 14; i++) {
        const soldier = g.spawnScriptedUnit('soldier', 1, base.x - 7 + i * 1.05, base.z + 14);
        soldier.hp = soldier.maxHp = 100_000;
        soldier.setCombatStance('agresivo');
        soldiers.push(soldier);
      }
      // Two dragons per soldier: the shape that used to put three riders on two horses.
      dragons.forEach((dragon, i) => dragon.issueOrder({ kind: 'attack', entityId: soldiers[i % 5].id }));

      const dt = 1 / 60;
      for (let i = 0; i < Math.ceil(seconds / dt); i++) g.update(dt, i * dt);

      g.camera.moveTo(base.x, base.z + 7, true);
      g.camera.setHeight(17);
      g.camera.setYaw(0);
      for (let i = 0; i < 30; i++) g.camera.update(dt, i * dt);
      g.renderer.render(g.scene, g.camera.camera);
    }, SECONDS);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'cavalry_0.png') });
  } finally {
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
console.log(`cavalry melee capture -> ${OUT}/cavalry_0.png`);
