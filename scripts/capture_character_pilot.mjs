import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

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
const CASES = [
  { name: 'inca', url: '/?mission=m_cusco_1536&intro=0&fog=0&low=1&noloop=1', kind: 'inca_warrior' },
  { name: 'spanish', url: '/?mission=m_lima&intro=0&fog=0&low=1&noloop=1', kind: 'musketeer' },
  { name: 'republic', url: '/?mission=m_tarapaca&intro=0&fog=0&low=1&noloop=1', kind: 'republica_defensor' },
  {
    name: 'moche',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=moche&period=2',
    kind: 'soldier',
  },
  {
    name: 'wari',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=wari&period=3',
    kind: 'soldier',
  },
  {
    name: 'chimu',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=chimu&period=4',
    kind: 'soldier',
  },
  {
    name: 'late-realista',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=realistas&period=7',
    kind: 'soldier',
  },
];
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

      await page.evaluate((kind) => {
        const g = window.game;
        const existing = [...g.units.values()].find((candidate) => candidate.owner === 0 && candidate.kind === kind);
        if (existing?.rig) return;
        // A skirmish opens with workers; the capture still needs one rigged combat unit on screen.
        const centre = g.playerCenter(0);
        g.spawnScriptedUnit(kind, 0, centre.x + 10, centre.z + 10);
      }, entry.kind);

      const place = async (yaw, state) => {
        await page.evaluate(
          ({ kind, yaw: rotation, state: pose }) => {
            const g = window.game;
            g.loop.stop();
            g.settings.timeOfDay = 'noon';
            g.sky.setTimeOfDay(0.5);
            g.sky.update(0);
            const unit = [...g.units.values()].find(
              (candidate) => candidate.owner === 0 && !candidate.dead && candidate.kind === kind,
            );
            if (!unit?.rig) throw new Error(`no rigged ${kind}`);
            const base = g.playerCenter(0);
            const point = g.findLandNear(base.x + 40, base.z + 40, 70);
            unit.clearOrders();
            unit.pos.set(point.x, g.terrain.getHeight(point.x, point.z), point.z);
            unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
            unit.view.setRotationY(rotation);
            if (pose === 'death') {
              unit.rig.playDeath();
              unit.rig.update(0.7);
            } else {
              unit.rig.play(pose === 'attack' ? 'attack' : 'idle', 0);
              unit.rig.update(pose === 'attack' ? 0.25 : 0.4);
            }
            const subject = { x: unit.pos.x, y: unit.pos.y, z: unit.pos.z };
            g.camera.camera.position.set(subject.x + 2.4, subject.y + 1.5, subject.z + 3.0);
            g.camera.camera.lookAt(subject.x, subject.y + 0.9, subject.z);
            g.renderer.render(g.scene, g.camera.camera);
          },
          { kind: entry.kind, yaw, state },
        );
        await page.screenshot({ path: path.join(OUT, `${entry.name}-${state}-${yaw > 0 ? 'side' : 'front'}.png`) });
      };

      // Death last: its clamped action would otherwise blend into the following pose.
      await place(0, 'idle');
      await place(0, 'attack');
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
