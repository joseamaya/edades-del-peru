import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Deterministic evidence captures for before/after comparisons.
 *
 * Usage:
 *   node scripts/shots_evidence.mjs --scene=fauna-perf --out=review/evidence/fauna-after
 *
 * The same scene is captured from a clean worktree (before) and the feature
 * branch (after) with the same seed, viewport, camera and fixed steps.
 *
 * Two game states of one commit can also be compared when the change is a moment of the match rather
 * than a code change: those scenes read a URL flag (e.g. `late=1`) that only the capture honours, and
 * their `prepare` labels it as such.
 */
const scene = cliArg('scene', 'fauna-perf');
const outDir = path.resolve(cliArg('out', 'review/evidence/fauna'));
const WIDTH = 1600;
const HEIGHT = 900;

/**
 * Wait for the game and a rendered frame before stopping the loop. The old
 * capture stopped immediately and could photograph terrain before its textures
 * and lighting were ready, which made the before/after look incomparable.
 */
async function waitForSceneReady(page) {
  await page.waitForFunction(
    () => {
      const g = window.game;
      return !!g && !!g.renderer && !!g.scene && !!g.camera?.camera && document.readyState === 'complete';
    },
    null,
    { timeout: 30_000 },
  );
  await page.evaluate(async () => {
    const g = window.game;
    g.loop.stop();
    g.renderer.render(g.scene, g.camera.camera);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    g.renderer.render(g.scene, g.camera.camera);
  });
  await page.waitForTimeout(500);
}

const ANDEAN_SHOWCASE_VIEWS = [
  { name: 'close', mode: 'close', offset: { x: 3.6, y: 2.3, z: 4.8 }, lookHeight: 1.0 },
  { name: 'rts', mode: 'rts', height: 20, centerSubject: true },
];

function andeanShowcase(url) {
  return {
    url,
    start: true,
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 12, base.z + 12, 16);
      for (const unit of [...g.units.values()]) {
        unit.removeFromScene();
        g.units.delete(unit.id);
      }
      const worker = g.spawnScriptedUnit('worker', 0, c.x - 1.8, c.z + 0.4);
      const soldier = g.spawnScriptedUnit('soldier', 0, c.x, c.z - 0.7);
      const ranged = g.spawnScriptedUnit('musketeer', 0, c.x + 1.8, c.z + 0.5);
      const enemy = g.spawnScriptedUnit('soldier', 1, c.x - 1.8, c.z - 1.2);
      const place = (unit, x, z, facing) => {
        unit.clearOrders();
        unit.pos.set(x, g.terrain.getHeight(x, z), z);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
        unit.view.setRotationY(facing);
        unit.rig?.play('idle', 0);
        unit.rig?.update(0.35);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
      };
      place(worker, c.x - 1.8, c.z + 0.4, 0.5);
      place(soldier, c.x, c.z - 0.7, 0.1);
      place(ranged, c.x + 1.8, c.z + 0.5, -0.5);
      place(enemy, c.x - 1.8, c.z - 1.2, 2.8);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: c.x, y: g.terrain.getHeight(c.x, c.z), z: c.z },
      };
    },
    views: ANDEAN_SHOWCASE_VIEWS,
  };
}

/** A standing field near the base, sown with the late crops when `late=1`. */
async function caralLateField() {
  const g = window.game;
  g.loop.stop();
  const late = new URLSearchParams(location.search).get('late') === '1';
  for (const unit of [...g.units.values()]) {
    unit.removeFromScene();
    g.units.delete(unit.id);
  }
  g.players[0].resources.food = 500;
  g.players[0].resources.wood = 500;
  const base = g.playerCenter(0);
  const spot = g.findFreeSpot(base.x + 10, base.z + 10, 4);
  if (!spot) throw new Error('no free farm spot');
  const farm = g.placeBuilding('farm', spot.x, spot.z);
  if (!farm) throw new Error('the field could not be placed');
  farm.completeInstantly();
  if (late) g.startEnvironmentalEvent('drought', true);
  for (let i = 0; i < 120; i++) g.loop.onUpdate(1 / 60, i / 60);
  g.scene.traverse((o) => {
    if (o.name?.startsWith('geo-label:')) o.visible = false;
  });
  g.renderer.render(g.scene, g.camera.camera);
  return {
    center: { x: spot.x, z: spot.z },
    subject: { x: spot.x, y: g.terrain.getHeight(spot.x, spot.z), z: spot.z },
  };
}

/**
 * The Act IV evidence pair: the same field before and after the drought. Both frames are game states of
 * one commit (the URL carries `late=1`), not before/after code states.
 */
function caralLateScenes() {
  const views = [
    { name: 'field', mode: 'close', offset: { x: 2.6, y: 1.9, z: 3.2 }, lookHeight: 0.5 },
    { name: 'field-rts', mode: 'rts', height: 16, centerSubject: true },
  ];
  return {
    'caral-late-field': {
      url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1&late=1',
      start: true,
      prepare: caralLateField,
      views,
    },
    'caral-late-field-before': {
      url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
      start: true,
      prepare: caralLateField,
      views,
    },
  };
}

const SCENES = {
  ...caralLateScenes(),
  'caral-worker': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
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
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const worker = [...g.units.values()].find((u) => u.kind === 'worker' && u.owner === 0);
      if (!worker) throw new Error('no player worker');
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 10, base.z + 10, 16);
      const companions = [
        { dx: 0, dz: 0, facing: 0.9, clip: 'idle', phase: 0.5 },
        { dx: -1.9, dz: 0.1, facing: 0.5, clip: 'gather', phase: 0.6 },
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
  'caral-worker-tasks': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const worker = [...g.units.values()].find((u) => u.kind === 'worker' && u.owner === 0);
      if (!worker) throw new Error('no player worker');
      let time = 0;
      const step = (count) => {
        for (let i = 0; i < count; i++) {
          time += 1 / 60;
          g.loop.onUpdate(1 / 60, time);
        }
      };
      const reset = () => {
        worker.clearOrders();
        worker.gatherCarry = { food: 0, wood: 0, silver: 0, stone: 0 };
        worker.currentResource = null;
        worker.walkCycle = 0;
        worker.path.length = 0;
        worker.pathIdx = 0;
      };
      const place = (x, z) => {
        reset();
        worker.pos.set(x, g.terrain.getHeight(x, z), z);
        worker.view.setPosition(x, worker.pos.y, z);
      };
      const findPad = () => {
        const base = g.playerCenter(0);
        for (let r = 10; r <= 40; r += 2) {
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            const x = base.x + Math.cos(a) * r;
            const z = base.z + Math.sin(a) * r;
            if (g.terrain.isWater(x, z) || g.terrain.isBeach(x, z)) continue;
            if (g.terrain.getSlope(x, z) > 0.12) continue;
            if ([...g.buildings.values()].some((b) => Math.hypot(b.pos.x - x, b.pos.z - z) < 5)) continue;
            if ([...g.resourceNodes.values()].some((n) => !n.dead && Math.hypot(n.pos.x - x, n.pos.z - z) < 4))
              continue;
            return { x, z };
          }
        }
        throw new Error('no flat task pad');
      };
      const subject = () => ({ x: worker.pos.x, y: worker.pos.y, z: worker.pos.z });
      window.__caralTask = (task) => {
        reset();
        if (task === 'idle') {
          const pad = findPad();
          place(pad.x, pad.z);
          step(20);
          worker.rig?.play('idle', 0);
          worker.rig?.update(0.4);
        } else if (task === 'walk') {
          const pad = findPad();
          place(pad.x, pad.z);
          g.executeCommand({
            kind: 'order',
            unitIds: [worker.id],
            order: { kind: 'move', target: { x: pad.x + 5, z: pad.z } },
            clear: true,
          });
          step(18);
          worker.rig?.update(0.2);
        } else if (task === 'gather') {
          const nodes = [...g.resourceNodes.values()].filter((n) => !n.dead);
          const node = nodes.find((n) => n.resource === 'food') ?? nodes[0];
          place(node.pos.x + 1.2, node.pos.z);
          g.executeCommand({
            kind: 'order',
            unitIds: [worker.id],
            order: { kind: 'gather', entityId: node.id },
            clear: true,
          });
          worker.path.length = 0;
          worker.pathIdx = 0;
          worker.walkCycle = 0;
          step(30);
        } else if (task === 'build') {
          const base = g.playerCenter(0);
          const c = g.findLandNear(base.x + 8, base.z - 6, 10);
          place(c.x, c.z);
          const building = g.spawnScriptedBuilding('house', 0, c.x + 2.5, c.z + 0.5);
          building.beginConstruction();
          place(building.pos.x - (building.radius + 1.2), building.pos.z);
          g.executeCommand({
            kind: 'order',
            unitIds: [worker.id],
            order: { kind: 'build', entityId: building.id },
            clear: true,
          });
          worker.path.length = 0;
          worker.pathIdx = 0;
          worker.walkCycle = 0;
          step(30);
        } else {
          const pad = findPad();
          place(pad.x, pad.z);
          worker.gatherCarry = { food: 0, wood: 10, silver: 0, stone: 0 };
          worker.currentResource = 'wood';
          g.executeCommand({
            kind: 'order',
            unitIds: [worker.id],
            order: { kind: 'move', target: { x: pad.x + 5, z: pad.z } },
            clear: true,
          });
          step(20);
        }
        worker.rig?.update(0.4);
        return { center: { x: worker.pos.x, z: worker.pos.z }, subject: subject() };
      };
      return window.__caralTask('gather');
    },
    views: [
      { name: 'idle', mode: 'close', task: 'idle', offset: { x: 2.8, y: 1.8, z: 3.8 }, lookHeight: 0.95 },
      { name: 'walk', mode: 'close', task: 'walk', offset: { x: 2.8, y: 1.8, z: 3.8 }, lookHeight: 0.95 },
      { name: 'gather', mode: 'close', task: 'gather', offset: { x: 2.6, y: 1.7, z: 3.6 }, lookHeight: 0.95 },
      { name: 'build', mode: 'close', task: 'build', offset: { x: 3.0, y: 1.9, z: 4.0 }, lookHeight: 0.95 },
      { name: 'carry', mode: 'close', task: 'deliver', offset: { x: -4.0, y: 1.9, z: 0.5 }, lookHeight: 1.0 },
    ],
  },
  'procedural-worker': {
    url: '/?mission=m3_moche_recuay&intro=0&fog=0&low=1&noloop=1',
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 10, base.z + 10, 12);
      const worker = g.spawnScriptedUnit('worker', 0, c.x, c.z);
      worker.clearOrders();
      worker.pos.set(c.x, g.terrain.getHeight(c.x, c.z), c.z);
      worker.view.setPosition(worker.pos.x, worker.pos.y, worker.pos.z);
      for (let i = 0; i < 30; i++) g.loop.onUpdate(1 / 60, i / 60);
      const offset = { x: 3.0, y: 2.0, z: 4.0 };
      worker.view.setRotationY(Math.atan2(offset.x, offset.z));
      worker.view.setPosition(worker.pos.x, worker.pos.y, worker.pos.z);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: worker.pos.x, y: worker.pos.y, z: worker.pos.z },
      };
    },
    views: [{ name: 'close', mode: 'close', offset: { x: 3.0, y: 2.0, z: 4.0 }, lookHeight: 1.0 }],
  },
  'caral-worker-genders': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const workers = [...g.units.values()].filter((u) => u.kind === 'worker' && u.owner === 0);
      const female = workers.find((u) => String(u.rig?.variantId ?? '').endsWith('_f')) ?? workers[0];
      const male =
        workers.find((u) => String(u.rig?.variantId ?? '').endsWith('_m') && u !== female) ??
        workers.find((u) => u !== female);
      if (!female || !male) throw new Error('need two workers');
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 10, base.z + 10, 12);
      for (const unit of workers) {
        if (unit !== female && unit !== male) {
          unit.removeFromScene();
          g.units.delete(unit.id);
        }
      }
      const place = (unit, x) => {
        unit.clearOrders();
        unit.pos.set(x, g.terrain.getHeight(x, c.z), c.z);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
        unit.view.setRotationY(0);
        unit.rig?.play('idle', 0);
        unit.rig?.update(0.3);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
      };
      place(female, c.x - 1.1);
      place(male, c.x + 1.1);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: c.x, y: g.terrain.getHeight(c.x, c.z), z: c.z },
      };
    },
    views: [{ name: 'close', mode: 'close', offset: { x: 0, y: 2.0, z: 5.0 }, lookHeight: 1.0 }],
  },
  'caral-scout-genders': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 10, base.z + 10, 12);
      const scouts = [...g.units.values()].filter((u) => u.kind === 'scout' && u.owner === 0);
      for (let i = 1; i <= 5; i++) scouts.push(g.spawnScriptedUnit('scout', 0, c.x + i, c.z + i));
      const female = scouts.find((u) => String(u.rig?.variantId ?? '').endsWith('_f')) ?? scouts[0];
      const male =
        scouts.find((u) => String(u.rig?.variantId ?? '').endsWith('_m') && u !== female) ??
        scouts.find((u) => u !== female);
      if (!female || !male) throw new Error('need two scouts');
      for (const unit of scouts) {
        if (unit !== female && unit !== male) {
          unit.removeFromScene();
          g.units.delete(unit.id);
        }
      }
      const place = (unit, x) => {
        unit.clearOrders();
        unit.pos.set(x, g.terrain.getHeight(x, c.z), c.z);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
        unit.view.setRotationY(0);
        unit.rig?.play('idle', 0);
        unit.rig?.update(0.3);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
      };
      place(female, c.x - 1.1);
      place(male, c.x + 1.1);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: c.x, y: g.terrain.getHeight(c.x, c.z), z: c.z },
      };
    },
    views: [
      { name: 'close', mode: 'close', offset: { x: 0, y: 2.0, z: 5.0 }, lookHeight: 1.0 },
      { name: 'rts', mode: 'rts', height: 20, centerSubject: true },
    ],
  },
  'procedural-genders': {
    url: '/?play=1&civ=moche&period=2&seed=777&fog=0&low=1&noloop=1',
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const base = g.playerCenter(0);
      let c = null;
      for (let r = 10; r <= 40 && !c; r += 2) {
        for (let i = 0; i < 24 && !c; i++) {
          const a = (i / 24) * Math.PI * 2;
          const x = base.x + Math.cos(a) * r;
          const z = base.z + Math.sin(a) * r;
          if (g.terrain.isWater(x, z) || g.terrain.isBeach(x, z)) continue;
          if (g.terrain.getSlope(x, z) > 0.12) continue;
          if ([...g.buildings.values()].some((b) => Math.hypot(b.pos.x - x, b.pos.z - z) < 5)) continue;
          if ([...g.resourceNodes.values()].some((n) => !n.dead && Math.hypot(n.pos.x - x, n.pos.z - z) < 4)) continue;
          c = { x, z };
        }
      }
      if (!c) throw new Error('no flat dressing pad');
      const workers = [];
      for (let i = 0; i < 6; i++) workers.push(g.spawnScriptedUnit('worker', 0, c.x + i, c.z + i));
      const female = workers.find((u) => u.gender === 'female') ?? workers[0];
      const male = workers.find((u) => u.gender === 'male' && u !== female) ?? workers[1];
      for (const unit of [...g.units.values()]) {
        if (unit !== female && unit !== male) {
          unit.removeFromScene();
          g.units.delete(unit.id);
        }
      }
      const place = (unit, x) => {
        unit.clearOrders();
        unit.pos.set(x, g.terrain.getHeight(x, c.z), c.z);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
        unit.view.setRotationY(0);
      };
      place(female, c.x - 1.1);
      place(male, c.x + 1.1);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: c.x, y: g.terrain.getHeight(c.x, c.z), z: c.z },
      };
    },
    views: [{ name: 'close', mode: 'close', offset: { x: 0, y: 2.0, z: 5.0 }, lookHeight: 1.0 }],
  },
  'rigged-attack': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 14, base.z + 14, 12);
      const target = g.spawnScriptedBuilding('house', 1, c.x + 1.8, c.z);
      const worker = [...g.units.values()].find((u) => u.owner === 0 && u.kind === 'worker');
      if (!worker) throw new Error('missing Caral worker');
      worker.clearOrders();
      worker.pos.set(c.x - 1.2, g.terrain.getHeight(c.x - 1.2, c.z), c.z);
      worker.view.setPosition(worker.pos.x, worker.pos.y, worker.pos.z);
      g.executeCommand({
        kind: 'order',
        unitIds: [worker.id],
        order: { kind: 'attack', entityId: target.id },
        clear: true,
      });
      let time = 0;
      for (let i = 0; i < 150; i++) {
        time += 1 / 60;
        g.loop.onUpdate(1 / 60, time);
      }
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: worker.pos.x, y: worker.pos.y, z: worker.pos.z },
      };
    },
    views: [
      { name: 'close', mode: 'close', offset: { x: -3.2, y: 2.0, z: 4.2 }, lookHeight: 0.95 },
      { name: 'rts', mode: 'rts', height: 18, centerSubject: true },
    ],
  },
  'caral-scout': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const scout = [...g.units.values()].find((u) => u.owner === 0 && u.kind === 'scout');
      if (!scout) throw new Error('no player scout');
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 10, base.z + 10, 12);
      scout.clearOrders();
      scout.pos.set(c.x, g.terrain.getHeight(c.x, c.z), c.z);
      scout.view.setPosition(scout.pos.x, scout.pos.y, scout.pos.z);
      for (let i = 0; i < 45; i++) g.loop.onUpdate(1 / 60, i / 60);
      const offset = { x: 3.0, y: 2.0, z: 4.0 };
      scout.view.setRotationY(Math.atan2(offset.x, offset.z));
      scout.rig?.play('walk', 0);
      scout.rig?.update(0.4);
      scout.view.setPosition(scout.pos.x, scout.pos.y, scout.pos.z);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: scout.pos.x, y: scout.pos.y, z: scout.pos.z },
      };
    },
    views: [
      { name: 'close', mode: 'close', offset: { x: 3.0, y: 2.0, z: 4.0 }, lookHeight: 1.0 },
      { name: 'rts', mode: 'rts', height: 28, centerSubject: true },
    ],
  },
  'inca-chasqui-genders': {
    url: '/?play=1&period=5&civ=inca&map=andes&seed=777&fog=0&low=1&noloop=1',
    prepare: () => {
      const g = window.game;
      g.loop.stop();
      const base = g.playerCenter(0);
      const c = g.findLandNear(base.x + 10, base.z + 10, 12);
      const scouts = [...g.units.values()].filter((u) => u.kind === 'scout' && u.owner === 0);
      for (let i = 1; i <= 5; i++) scouts.push(g.spawnScriptedUnit('scout', 0, c.x + i, c.z + i));
      const female = scouts.find((u) => String(u.rig?.variantId ?? '').endsWith('_f')) ?? scouts[0];
      const male =
        scouts.find((u) => String(u.rig?.variantId ?? '').endsWith('_m') && u !== female) ??
        scouts.find((u) => u !== female);
      if (!female || !male) throw new Error('need two chasquis');
      for (const unit of scouts) {
        if (unit !== female && unit !== male) {
          unit.removeFromScene();
          g.units.delete(unit.id);
        }
      }
      const place = (unit, x) => {
        unit.clearOrders();
        unit.pos.set(x, g.terrain.getHeight(x, c.z), c.z);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
        unit.view.setRotationY(0);
        unit.rig?.play('idle', 0);
        unit.rig?.update(0.3);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
      };
      place(female, c.x - 1.1);
      place(male, c.x + 1.1);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: c.x, z: c.z },
        subject: { x: c.x, y: g.terrain.getHeight(c.x, c.z), z: c.z },
      };
    },
    views: [
      { name: 'close', mode: 'close', offset: { x: 0, y: 2.0, z: 5.0 }, lookHeight: 1.0 },
      { name: 'rts', mode: 'rts', height: 20, centerSubject: true },
    ],
  },
  'moche-units': andeanShowcase('/?mission=m3_moche_recuay&intro=0&fog=0&low=1&noloop=1'),
  'early-horizon-units': andeanShowcase('/?mission=m2_chavin&intro=0&fog=0&low=1&noloop=1'),
  'middle-horizon-units': andeanShowcase('/?mission=m4_wari&intro=0&fog=0&low=1&noloop=1'),
  'late-horizon-units': andeanShowcase('/?mission=m5_yahuar_pampa&intro=0&fog=0&low=1&noloop=1'),
  'chimu-inca-units': andeanShowcase('/?mission=m6_chimu_inca&intro=0&fog=0&low=1&noloop=1'),
  'chavin-scene': {
    url: '/?civ=chavin&period=1&seed=777&fog=0&low=1',
    live: true,
    views: [{ name: 'close', mode: 'rts', target: 'base', height: 28 }],
  },
  'chavin-scene-rts': {
    url: '/?civ=chavin&period=1&seed=777&fog=0&low=1',
    live: true,
    views: [{ name: 'rts', mode: 'rts', target: 'base', height: 60 }],
  },
  'chavin-landmark': {
    url: '/?civ=chavin&period=1&seed=777&fog=0&low=1',
    live: true,
    views: [
      { name: 'close', mode: 'close', target: 'landmark', offset: { x: 14, y: 9, z: 18 }, lookHeight: 3.0 },
      { name: 'rts', mode: 'rts', target: 'landmark', height: 32 },
    ],
  },
  'caral-household': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: async () => {
      const g = window.game;
      g.loop.stop();
      // The household kit arrives asynchronously; the capture must not race the procedural fallback.
      const deadline = performance.now() + 20_000;
      while (!(g.settlementDressing ?? []).some((d) => d.attached) && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      // Player 0 spawns first; the kit attaches to both bases of the mirror match.
      const dressing = g.settlementDressing?.[0];
      if (!dressing?.attached) throw new Error('household kit did not load');
      // Units wander through the props; the subject is the kit, so take them out of the shot.
      for (const unit of [...g.units.values()]) {
        unit.removeFromScene();
        g.units.delete(unit.id);
      }
      const racks = dressing.placements.filter((p) => p.kind === 'drying_rack');
      const prop = racks[racks.length - 1] ?? dressing.placements[0];
      const base = g.playerCenter(0);
      // Settle the mission's lighting and sky: the loop is stopped, so drive it by hand.
      for (let i = 0; i < 60; i++) g.loop.onUpdate(1 / 60, i / 60);
      // Place names are map labels, not props: hide them (the loop update re-shows them).
      g.scene.traverse((o) => {
        if (o.name?.startsWith('geo-label:')) o.visible = false;
      });
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: base.x, z: base.z },
        subject: { x: prop.x, y: g.terrain.getHeight(prop.x, prop.z), z: prop.z },
      };
    },
    views: [
      { name: 'close', mode: 'close', offset: { x: 1.9, y: 1.5, z: 1.9 }, lookHeight: 0.6 },
      { name: 'rts', mode: 'rts', height: 30, centerSubject: true },
      { name: 'base', mode: 'rts', height: 32 },
    ],
  },
  'caral-pacae': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: async () => {
      const g = window.game;
      g.loop.stop();
      const deadline = performance.now() + 20_000;
      while (!g.pacae?.model && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!g.pacae?.model) throw new Error('pacae kit did not load');
      for (const unit of [...g.units.values()]) {
        unit.removeFromScene();
        g.units.delete(unit.id);
      }
      // The nearest visible shrub keeps the sea and the far shore out of the frame.
      const base = g.playerCenter(0);
      const shrubs = [...g.pacae.ordered[0], ...g.pacae.ordered[1]];
      shrubs.sort((a, b) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(b.x - base.x, b.z - base.z));
      const shrub = shrubs[0];
      // Let the mission settle, then drive the stopped loop and hide the place names.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      for (let i = 0; i < 120; i++) g.loop.onUpdate(1 / 60, i / 60);
      g.scene.traverse((o) => {
        if (o.name?.startsWith('geo-label:')) o.visible = false;
      });
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: shrub.x, z: shrub.z },
        subject: { x: shrub.x, y: g.terrain.getHeight(shrub.x, shrub.z), z: shrub.z },
      };
    },
    views: [
      { name: 'close', mode: 'close', offset: { x: 2.1, y: 1.5, z: 2.1 }, lookHeight: 0.7 },
      { name: 'rts', mode: 'rts', height: 30, centerSubject: true },
    ],
  },
  'caral-quarry': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: async () => {
      const g = window.game;
      g.loop.stop();
      const deadline = performance.now() + 20_000;
      while (
        (g.scene.getObjectByName('props_kit_granodiorite_lod0')?.count ?? 0) +
          (g.scene.getObjectByName('props_kit_granodiorite_lod1')?.count ?? 0) ===
        0
      ) {
        if (performance.now() > deadline) throw new Error('granodiorite kit did not load');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const base = g.playerCenter(0);
      const node = [...g.resourceNodes.values()]
        .filter((n) => n.kind === 'well')
        .sort(
          (a, b) => Math.hypot(a.pos.x - base.x, a.pos.z - base.z) - Math.hypot(b.pos.x - base.x, b.pos.z - base.z),
        )[0];
      if (!node) throw new Error('no Caral quarry node');
      for (const unit of [...g.units.values()]) {
        unit.removeFromScene();
        g.units.delete(unit.id);
      }
      for (let i = 0; i < 90; i++) g.loop.onUpdate(1 / 60, i / 60);
      g.scene.traverse((o) => {
        if (o.name?.startsWith('geo-label:')) o.visible = false;
      });
      // Debug-only footprint ring: the game never draws it; it makes the collision radius reviewable.
      const points = [];
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const x = node.pos.x + Math.cos(a) * node.navRadius;
        const z = node.pos.z + Math.sin(a) * node.navRadius;
        points.push(new window.THREE.Vector3(x, g.terrain.getHeight(x, z) + 0.12, z));
      }
      const ring = new window.THREE.LineLoop(
        new window.THREE.BufferGeometry().setFromPoints(points),
        new window.THREE.LineBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.9, depthTest: false }),
      );
      ring.name = 'debug:quarry-footprint';
      ring.renderOrder = 20;
      g.scene.add(ring);
      g.renderer.render(g.scene, g.camera.camera);
      return {
        center: { x: node.pos.x, z: node.pos.z },
        subject: { x: node.pos.x, y: g.terrain.getHeight(node.pos.x, node.pos.z), z: node.pos.z },
      };
    },
    views: [
      { name: 'quarry', mode: 'rts', height: 26 },
      { name: 'close', mode: 'close', offset: { x: 6, y: 5, z: 7 }, lookHeight: 0.8 },
    ],
  },
  'caral-camp': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    prepare: async () => {
      const g = window.game;
      g.loop.stop();
      g.setSitePhase('foundation');
      const deadline = performance.now() + 20_000;
      while (
        ((g.siteCrew?.count ?? 0) === 0 || !g.landmark?.getObjectByName('caral_city_lod0')) &&
        performance.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!g.siteCrew?.count) throw new Error('construction crew did not load');
      for (const unit of [...g.units.values()]) {
        unit.removeFromScene();
        g.units.delete(unit.id);
      }
      for (let i = 0; i < 120; i++) g.loop.onUpdate(1 / 60, i / 60);
      g.scene.traverse((o) => {
        if (o.name?.startsWith('geo-label:')) o.visible = false;
      });
      g.renderer.render(g.scene, g.camera.camera);
      const y = g.terrain.getHeight(140.4, 29.0);
      return {
        center: { x: 150, z: 32 },
        subject: { x: 140.4, y, z: 29.0 },
      };
    },
    views: [
      { name: 'close', mode: 'close', offset: { x: 4.5, y: 5.5, z: 5.5 }, lookHeight: 0.9 },
      { name: 'camp', mode: 'rts', height: 20, center: { x: 138, z: 30.5 } },
      { name: 'trace', mode: 'rts', height: 42, center: { x: 160, z: 54 } },
      { name: 'act3', mode: 'rts', height: 55, center: { x: 150, z: 44 } },
      { name: 'approach', mode: 'rts', height: 55, center: { x: 96, z: 162 } },
      { name: 'grove', mode: 'rts', height: 44, center: { x: 62, z: 132 } },
      { name: 'rts', mode: 'rts', height: 85, center: { x: 152, z: 40 } },
    ],
  },
  'hud-objectives-act3': {
    url: '/?mission=m1_caral&intro=0&fog=0&low=1&noloop=1',
    start: true,
    hud: true,
    viewport: { width: 1280, height: 720 },
    prepare: async () => {
      const g = window.game;
      g.loop.stop();
      document.getElementById('ed-dialogue')?.classList.remove('show');
      // The recorded Act III frame: two optional goals and the wood delivery at 100/150.
      const active = new Set(['a1_huaca', 'a3_shicras', 'obj_asamblea']);
      for (const o of g.mission.def.objectives) {
        // Later acts are still pending, not archived as finished; Act I/II are done.
        g.mission.objState.set(
          o.id,
          active.has(o.id) ? 'activo' : /^Acto (III|IV) ·/.test(o.title) ? 'pendiente' : 'completed',
        );
      }
      g.mission.delivered.set('a3_shicras', 100);
      const worker = [...g.units.values()].find((u) => u.owner === 0 && u.kind === 'worker' && !u.dead);
      if (!worker) throw new Error('no player worker');
      g.selectUnits([worker.id]);
      // A real frame of the base behind the HUD, not the sky where the opening camera left it.
      const base = g.playerCenter(0);
      g.camera.moveTo(base.x, base.z, true);
      g.camera.setHeight(44);
      for (let i = 0; i < 90; i++) g.camera.update(1 / 60);
      g.renderer.render(g.scene, g.camera.camera);
      g.hud.showTutorialStep(
        'Lleva un obrero a la Pirámide Mayor, haz clic sobre ella y pulsa «Entregar materiales». ' +
          'Cada entrega y cada turno de obra hacen crecer la pirámide.',
        8,
        10,
      );
      for (let i = 0; i < 3; i++) {
        g.hud.update(0.2, 0);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      return null;
    },
    views: [],
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
  const viewport = config.viewport ?? { width: WIDTH, height: HEIGHT };
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  try {
    await page.goto(base + config.url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30_000 });
    await waitForSceneReady(page);
    if (config.start) {
      await page
        .locator('.ed-primary', { hasText: 'COMENZAR' })
        .first()
        .click({ timeout: 3000 })
        .catch(() => {});
    }
    await page.waitForTimeout(250);
    if (!config.hud) {
      await page.evaluate(() => {
        const root = document.getElementById('ui-root');
        if (root) root.style.display = 'none';
      });
    }
    const target = config.live ? null : await page.evaluate(config.prepare);
    if (config.hud) {
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(outDir, 'hud.png') });
      const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
      fs.writeFileSync(
        path.join(outDir, 'manifest.json'),
        JSON.stringify({ scene, commit, url: config.url, ...viewport, views: ['hud'] }, null, 2),
      );
      console.log(`${scene}: hud -> ${outDir}`);
      if (errors.length) {
        console.error(`page errors: ${errors.slice(0, 2).join(' | ')}`);
        process.exitCode = 1;
      }
      return;
    }
    for (const view of config.views) {
      await page.evaluate(
        ({ target, view, live }) => {
          const g = window.game;
          g.loop.stop();
          const p = view.target === 'landmark' ? g.landmark?.position : g.playerCenter(0);
          const liveTarget = p
            ? { center: { x: p.x, z: p.z }, subject: { x: p.x, y: g.terrain.getHeight(p.x, p.z), z: p.z } }
            : null;
          const active = live ? liveTarget : view.task ? window.__caralTask(view.task) : target;
          if (view.mode === 'close') {
            const s = active.subject;
            const offset = view.offset ?? { x: 4, y: 2.4, z: 5 };
            g.camera.camera.position.set(s.x + offset.x, s.y + offset.y, s.z + offset.z);
            g.camera.camera.lookAt(s.x, s.y + (view.lookHeight ?? 1.1), s.z);
          } else {
            g.camera.setYaw(0);
            const center = view.center ?? active.center;
            g.camera.moveTo(center.x, center.z, true);
            g.camera.setHeight(view.height);
            for (let i = 0; i < 60; i++) g.camera.update(1 / 60);
            if (view.centerSubject && active.subject) {
              // The RTS camera looks at y=0, so a subject on elevated terrain projects
              // above center; nudge the target away from the camera until it is centered.
              const subject = new window.THREE.Vector3(active.subject.x, active.subject.y + 0.9, active.subject.z);
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
          // A crew only draws near the camera: re-evaluate it after the framing move. A close view
          // moves the raw camera, so the RTS target is still the old one.
          const crewFocus =
            view.mode === 'close' && active?.subject
              ? { x: active.subject.x, z: active.subject.z }
              : g.camera.getTarget();
          g.siteCrew?.update(0, crewFocus);
          g.renderer.render(g.scene, g.camera.camera);
        },
        { target, view, live: config.live === true },
      );
      await page.screenshot({ path: path.join(outDir, `${view.name}.png`) });
    }
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    fs.writeFileSync(
      path.join(outDir, 'manifest.json'),
      JSON.stringify({ scene, commit, url: config.url, width: WIDTH, height: HEIGHT, views: config.views }, null, 2),
    );
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
