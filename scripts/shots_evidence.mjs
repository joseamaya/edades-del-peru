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
  'caral-worker': {
    url: '/?play=1&civ=caral&period=0&map=altiplano&seed=3000&fog=0&low=1&noloop=1',
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const worker = [...g.units.values()].find((u) => u.kind === 'worker' && u.owner === 0);
      if (!worker) throw new Error('no player worker');
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 16, base.z + 16, 20);
      worker.clearOrders();
      worker.pos.set(c.x, g.terrain.getHeight(c.x, c.z), c.z);
      worker.view.setPosition(worker.pos.x, worker.pos.y, worker.pos.z);
      for (let i = 0; i < 45; i++) g.loop.onUpdate(1 / 60, i / 60);
      const offset = { x: 2.6, y: 1.7, z: 3.6 };
      worker.rig?.play('idle', 0);
      worker.rig?.update(0.6);
      worker.view.setRotationY(Math.atan2(offset.x, offset.z));
      worker.view.setPosition(worker.pos.x, worker.pos.y, worker.pos.z);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: worker.pos.x, y: worker.pos.y, z: worker.pos.z },
      };
    },
    views: [{ name: 'close', mode: 'close', offset: { x: 2.6, y: 1.7, z: 3.6 }, lookHeight: 0.95 }],
  },
  'caral-worker-rts': {
    url: '/?play=1&civ=caral&period=0&map=altiplano&seed=3000&fog=0&low=1&noloop=1',
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const worker = [...g.units.values()].find((u) => u.kind === 'worker' && u.owner === 0);
      if (!worker) throw new Error('no player worker');
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 10, base.z + 10, 16);
      const companions = [
        { dx: 0, dz: 0, facing: 0.9, clip: 'idle', phase: 0.5 },
        { dx: -1.9, dz: 0.1, facing: 0.5, clip: 'work', phase: 0.6 },
        { dx: 1.9, dz: 0.4, facing: -0.6, clip: 'walk', phase: 0.35 },
        { dx: 0.2, dz: -2.1, facing: 2.8, clip: 'idle', phase: 1.2 },
      ];
      worker.removeFromScene();
      const units = companions.map((c2) => {
        const x = c.x + c2.dx;
        const z = c.z + c2.dz;
        const u = g.spawnScriptedUnit('worker', 0, x, z);
        u.clearOrders();
        u.pos.set(x, g.terrain.getHeight(x, z), z);
        u.yaw = c2.facing;
        u.targetYaw = c2.facing;
        u.view.setPosition(u.pos.x, u.pos.y, u.pos.z);
        u.view.setRotationY(c2.facing);
        return { unit: u, clip: c2.clip, phase: c2.phase };
      });
      for (let i = 0; i < 45; i++) g.loop.onUpdate(1 / 60, i / 60);
      for (const entry of units) {
        entry.unit.rig?.play(entry.clip, 0);
        entry.unit.rig?.update(entry.phase);
        entry.unit.view.setRotationY(entry.unit.yaw);
        entry.unit.view.setPosition(entry.unit.pos.x, entry.unit.pos.y, entry.unit.pos.z);
      }
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: units[0].unit.pos.x, y: units[0].unit.pos.y, z: units[0].unit.pos.z },
      };
    },
    views: [{ name: 'rts', mode: 'rts', height: 20, centerSubject: true }],
  },
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
            const offset = view.offset ?? { x: 4, y: 2.4, z: 5 };
            g.camera.camera.position.set(s.x + offset.x, s.y + offset.y, s.z + offset.z);
            g.camera.camera.lookAt(s.x, s.y + (view.lookHeight ?? 1.1), s.z);
          } else {
            g.camera.moveTo(target.center.x, target.center.z, true);
            g.camera.setHeight(view.height);
            for (let i = 0; i < 60; i++) g.camera.update(1 / 60);
            if (view.centerSubject && target.subject) {
              // The RTS camera looks at y=0, so a subject on elevated terrain projects
              // above center; nudge the target away from the camera until it is centered.
              const subject = new window.THREE.Vector3(target.subject.x, target.subject.y + 0.9, target.subject.z);
              const yaw = g.camera.getYaw();
              for (let i = 0; i < 8; i++) {
                const p = subject.clone().project(g.camera.camera);
                const k = g.camera.getZoom() * 0.46 * p.y;
                g.camera.moveTo(
                  g.camera.getTarget().x - Math.sin(yaw) * k,
                  g.camera.getTarget().z - Math.cos(yaw) * k,
                  true,
                );
                g.camera.update(1 / 60);
              }
            }
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
