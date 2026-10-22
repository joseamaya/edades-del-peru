import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Deterministic evidence captures for before/after comparisons.
 *
 * Usage:
 *   node scripts/shots_evidence.mjs --scene=fauna-perf --out=review/evidence/fauna-after
 *
 * The same scene is captured from a clean worktree (before) and the feature
 * branch (after) with the same seed, viewport, camera and fixed steps.
 */
const scene = cliArg('scene', 'fauna-perf');
const outDir = path.resolve(cliArg('out', 'review/evidence/fauna'));
const WIDTH = 1600;
const HEIGHT = 900;

const SCENES = {
  'fauna-perf': {
    url: '/?play=1&civ=caral&period=0&map=altiplano&seed=777&fog=0&low=1&noloop=1',
    prepare: () => {
      const g = window.game;
      for (const a of g.wildlife.animals) {
        a.group.removeFromParent();
        a.rig?.dispose();
      }
      g.wildlife.animals.length = 0;
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 18, base.z + 18, 20);
      const spawns = [];
      for (let i = 0; i < 8; i++) {
        const ang = i * 2.399963229728653;
        const radius = 6 + (i % 4) * 2;
        spawns.push({ id: 'llama', x: c.x + Math.cos(ang) * radius, z: c.z + Math.sin(ang) * radius, scale: 1 });
      }
      g.wildlife.spawn(spawns, (x, z) => g.terrain.getHeight(x, z));
      for (let i = 0; i < 180; i++) g.loop.onUpdate(1 / 60, i / 60);
      const camera = { x: c.x + 11, z: c.z + 13 };
      const subject = g.wildlife.animals
        .map((a) => a.group.position)
        .sort((a, b) => Math.hypot(a.x - camera.x, a.z - camera.z) - Math.hypot(b.x - camera.x, b.z - camera.z))[0] ?? {
        x: c.x,
        y: 0,
        z: c.z,
      };
      return { center: { x: base.x, z: base.z }, subject: { x: subject.x, y: subject.y, z: subject.z } };
    },
    views: [
      { name: 'close', mode: 'close' },
      { name: 'rts', mode: 'rts', height: 48 },
    ],
  },
};

async function main() {
  const config = SCENES[scene];
  if (!config) throw new Error(`unknown scene "${scene}" (known: ${Object.keys(SCENES).join(', ')})`);
  fs.mkdirSync(outDir, { recursive: true });
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(base + config.url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30_000 });
    await page.evaluate(() => {
      const root = document.getElementById('ui-root');
      if (root) root.style.display = 'none';
    });
    const target = await page.evaluate(config.prepare);
    for (const view of config.views) {
      await page.evaluate(
        ({ target, view }) => {
          const g = window.game;
          g.loop.stop();
          if (view.mode === 'close') {
            const s = target.subject;
            g.camera.camera.position.set(s.x + 4, s.y + 2.4, s.z + 5);
            g.camera.camera.lookAt(s.x, s.y + 1.1, s.z);
          } else {
            g.camera.moveTo(target.center.x, target.center.z, true);
            g.camera.setHeight(view.height);
            for (let i = 0; i < 60; i++) g.camera.update(1 / 60);
          }
          g.renderer.render(g.scene, g.camera.camera);
        },
        { target, view },
      );
      await page.screenshot({ path: path.join(outDir, `${view.name}.png`) });
    }
    console.log(`${scene}: ${config.views.map((v) => v.name).join(', ')} -> ${outDir}`);
    if (errors.length) {
      console.error(`page errors: ${errors.slice(0, 2).join(' | ')}`);
      process.exitCode = 1;
    }
  } finally {
    await context.close();
    await browser.close();
    await close();
  }
}

await main();
