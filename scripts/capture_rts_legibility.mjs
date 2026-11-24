import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Character legibility at the strategic camera: a small mixed squad of each era in its own mission at noon,
 * framed at the default RTS zoom with the HUD hidden, plus a 2× crop of the squad.
 *
 * Usage:
 *   node scripts/capture_rts_legibility.mjs --out=review/legibility
 *
 * Run it from a checkout of the previous commit with another `--out` for the before set.
 */
const OUT = path.resolve(cliArg('out', 'review/legibility'));
const ZOOM = Number(cliArg('zoom', '34'));
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { name: 'inca', url: '/?mission=m_cusco_1536&intro=0&fog=0&noloop=1', squad: ['inca_warrior', 'inca_slinger'] },
  { name: 'spanish', url: '/?mission=m_lima&intro=0&fog=0&noloop=1', squad: ['musketeer', 'cavalry'] },
  { name: 'rebels', url: '/?mission=m7_tupac_amaru&intro=0&fog=0&noloop=1', squad: ['rifleman', 'cavalry'] },
  { name: 'republic', url: '/?mission=m_tarapaca&intro=0&fog=0&noloop=1', squad: ['republica_defensor', 'rifleman'] },
];

const { base, close } = await withViteServer({ optimizeDeps: { noDiscovery: true } });
const browser = await launchChromium();
try {
  for (const entry of CASES) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    try {
      await page.goto(base + entry.url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
      await page
        .getByRole('button', { name: /COMENZAR MISIÓN/i })
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {});
      await page.waitForTimeout(600);
      const centre = await page.evaluate(
        ({ squad, zoom }) => {
          const root = document.getElementById('ui-root');
          if (root) root.style.display = 'none';
          const g = window.game;
          g.loop.stop();
          g.settings.timeOfDay = 'noon';
          g.sky.setTimeOfDay(0.5);
          g.sky.update(0);
          const home = g.playerCenter(0);
          const at = g.findLandNear(home.x + 18, home.z + 18, 60);
          const spawned = [];
          squad.forEach((kind, row) => {
            for (let i = 0; i < 5; i++) {
              const x = at.x + (i - 2) * 1.6;
              const z = at.z + (row - 0.5) * 2.4;
              const unit = g.spawnScriptedUnit(kind, 0, x, z);
              if (!unit) continue;
              unit.clearOrders?.();
              unit.pos.set(x, g.terrain.getHeight(x, z), z);
              unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
              unit.view.setRotationY(0.35);
              spawned.push(unit);
            }
          });
          for (const unit of spawned) {
            unit.rig?.play('idle', 0);
            unit.rig?.update(0.3 + (unit.id % 5) * 0.1);
          }
          g.camera.setYaw(0);
          g.camera.moveTo(at.x, at.z, true);
          g.camera.setHeight(zoom);
          for (let i = 0; i < 90; i++) g.camera.update(1 / 60, i / 60);
          g.runtime.render();
          // Squad centre on screen, for the crop.
          const cam = g.camera.camera;
          const v = cam.position.clone();
          let sx = 0;
          let sy = 0;
          for (const unit of spawned) {
            v.set(unit.pos.x, unit.pos.y + 1, unit.pos.z).project(cam);
            sx += ((v.x + 1) / 2) * window.innerWidth;
            sy += ((1 - v.y) / 2) * window.innerHeight;
          }
          const n = Math.max(1, spawned.length);
          return { count: spawned.length, rigged: spawned.filter((u) => u.rig).length, x: sx / n, y: sy / n };
        },
        { squad: entry.squad, zoom: ZOOM },
      );
      if (centre.rigged === 0) throw new Error(`${entry.name}: no rigged units`);
      await page.screenshot({ path: path.join(OUT, `${entry.name}-rts.png`) });
      await page.screenshot({
        path: path.join(OUT, `${entry.name}-crop.png`),
        clip: {
          x: Math.round(Math.min(1200, Math.max(0, centre.x - 200))),
          y: Math.round(Math.min(675, Math.max(0, centre.y - 112))),
          width: 400,
          height: 225,
        },
      });
      console.log(`${entry.name}: ${centre.rigged}/${centre.count} rigged`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await close();
}
console.log(`legibility captures -> ${OUT}`);
