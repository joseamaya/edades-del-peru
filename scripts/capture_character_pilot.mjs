import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';
import { CHARACTER_CASES, ensureRiggedUnit } from './character_pilot_cases.mjs';

/**
 * Character-standard captures: the dressed infantry in their missions/skirmishes at a fixed noon
 * light, with the HUD hidden.
 *
 * Usage:
 *   node scripts/capture_character_pilot.mjs --out=review/pilot
 *
 * The before set is produced by running the same script from a worktree at `origin/main` (the old
 * `workerAttire.ts`/`uniformAttire.ts`) with `--out=review/pilot-before`; the committed comparison is
 * `docs/media/character-pilot-before-after.webp`.
 */
const OUT = path.resolve(cliArg('out', 'review/pilot'));
const CASES = CHARACTER_CASES;
fs.mkdirSync(OUT, { recursive: true });

const { base, close } = await withViteServer({ optimizeDeps: { noDiscovery: true } });
const browser = await launchChromium();
try {
  for (const entry of CASES) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    try {
      await page.goto(base + entry.url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30_000 });
      await page
        .getByRole('button', { name: /COMENZAR MISIÓN/i })
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {});
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const root = document.getElementById('ui-root');
        if (root) root.style.display = 'none';
      });

      await ensureRiggedUnit(page, entry.kind);

      const place = async (yaw, state) => {
        await page.evaluate(
          ({ kind, yaw: rotation, state: pose }) => {
            const g = window.game;
            g.loop.stop();
            g.settings.timeOfDay = 'noon';
            g.sky.setTimeOfDay(0.5);
            g.sky.update(0);
            const unit =
              g.units.get(window.__captureUnitId) ??
              [...g.units.values()].find(
                (candidate) => candidate.owner === 0 && !candidate.dead && candidate.kind === kind,
              );
            if (!unit?.rig) throw new Error(`no rigged ${kind}`);
            const origin = window.__captureOrigin ?? { x: unit.pos.x, z: unit.pos.z };
            const point = g.findLandNear(origin.x + 40, origin.z + 40, 70);
            unit.clearOrders();
            unit.pos.set(point.x, g.terrain.getHeight(point.x, point.z), point.z);
            unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
            unit.view.setRotationY(rotation);
            if (pose === 'death') {
              unit.rig.playDeath();
              unit.rig.update(0.7);
            } else if (pose === 'hit') {
              unit.rig.play('idle', 0);
              unit.rig.update(0.2);
              unit.rig.playHit?.(0);
              unit.rig.update(0.12);
            } else {
              const clip = { idle: 'idle', run: 'run', attack: 'attack' }[pose] ?? 'idle';
              const at = { idle: 0.4, run: 0.35, attack: 0.25 }[pose] ?? 0.4;
              unit.rig.play(clip, 0);
              unit.rig.update(at);
            }
            const subject = { x: unit.pos.x, y: unit.pos.y, z: unit.pos.z };
            g.camera.camera.position.set(subject.x + 2.6, subject.y + 1.55, subject.z + 3.2);
            g.camera.camera.lookAt(subject.x, subject.y + 1.0, subject.z);
            g.renderer.render(g.scene, g.camera.camera);
          },
          { kind: entry.kind, yaw, state },
        );
        await page.screenshot({ path: path.join(OUT, `${entry.name}-${state}-${yaw > 0 ? 'side' : 'front'}.png`) });
      };

      // Death last: its clamped action would otherwise blend into the following pose.
      await place(0, 'idle');
      await place(0, 'run');
      await place(0, 'attack');
      await place(0, 'hit');
      await place(Math.PI / 2, 'idle');
      await place(0, 'death');

      await page.evaluate((kind) => {
        const g = window.game;
        const unit = [...g.units.values()].find(
          (candidate) => candidate.owner === 0 && !candidate.dead && candidate.kind === kind,
        );
        if (!unit) return;
        g.camera.setYaw(0);
        g.camera.moveTo(unit.pos.x, unit.pos.z, true);
        g.camera.setHeight(54);
        for (let i = 0; i < 60; i++) g.camera.update(1 / 60, i / 60);
        g.renderer.render(g.scene, g.camera.camera);
      }, entry.kind);
      await page.screenshot({ path: path.join(OUT, `${entry.name}-rts.png`) });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await close();
}
console.log(`character pilot captures -> ${OUT}`);
