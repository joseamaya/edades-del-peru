import { test, expect } from '@playwright/test';
import type { Difficulty } from '../../src/core/Config';

/** Boot a skirmish, stop the loop and move all human units to a far corner so the
 *  only actors are the ones each test spawns. */
async function bootSkirmish(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    for (const u of g.units.values()) {
      if (u.owner === 0) {
        u.pos.set(4, g.terrain.getHeight(4, 4), 4);
        u.clearOrders();
        u.combatStance = 'pasivo';
      }
    }
  });
}

test('the AI recalls idle soldiers to defend its base', { tag: '@smoke' }, async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const aiCenter = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center');
    const defender = g.spawnScriptedUnit('soldier', 1, aiCenter.pos.x + 3, aiCenter.pos.z);
    defender.clearOrders();
    defender.combatStance = 'pasivo';
    const threat = g.spawnScriptedUnit('soldier', 0, aiCenter.pos.x + 10, aiCenter.pos.z);
    threat.clearOrders();
    threat.combatStance = 'pasivo';
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    const order = defender.orderQueue[0];
    return { kind: order?.kind ?? null, target: order?.entityId ?? null, threatId: threat.id };
  });
  expect(out.kind).toBe('attack');
  expect(out.target).toBe(out.threatId);
});

test('the LOS-aware AI only knows enemies it has seen', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.players[1].alive = false;
    for (const u of g.units.values()) if (u.owner === 1) u.die();
    g.addAI(0);
    const ai = g.ais[g.ais.length - 1]; // the just-added player-0 AI (player 1's is added in the constructor)
    // an enemy in a far corner, away from every player unit/building
    const spot = g.findLandNear(g.settings.mapSize - 15, g.settings.mapSize - 15);
    const enemy = g.spawnScriptedUnit('soldier', 1, spot.x, spot.z);
    enemy.combatStance = 'pasivo';
    let t = 0;
    for (let i = 0; i < 30; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const before = ai.seenUnits.has(enemy.id);
    // a player unit walks up to it (teleport next to the enemy; avoid water relocation)
    const watcher = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead);
    watcher.clearOrders();
    watcher.pos.set(spot.x + 3, watcher.pos.y, spot.z);
    watcher.snapToGround();
    for (let i = 0; i < 30; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const after = ai.seenUnits.has(enemy.id);
    return { before, after };
  });
  expect(out.before).toBe(false);
  expect(out.after).toBe(true);
});

test('the AI retreats a badly wounded soldier toward its base', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const aiCenter = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center');
    const bx = aiCenter.pos.x;
    const bz = aiCenter.pos.z;
    // pick a direction where a path back to the base exists (some directions cross water)
    let ang = -1;
    for (let a = 0; a < 32; a++) {
      const t = (a / 32) * Math.PI * 2;
      const wx = bx + Math.cos(t) * 20;
      const wz = bz + Math.sin(t) * 20;
      if (!g.pathfinder.isWalkable(wx, wz)) continue;
      if (g.pathfinder.pathfind(wx, wz, bx, bz).length > 0) {
        ang = t;
        break;
      }
    }
    if (ang < 0) return null;

    const victim = g.spawnScriptedUnit('soldier', 0, bx + Math.cos(ang) * 28, bz + Math.sin(ang) * 28);
    victim.clearOrders();
    victim.combatStance = 'pasivo';
    const wounded = g.spawnScriptedUnit('soldier', 1, bx + Math.cos(ang) * 20, bz + Math.sin(ang) * 20);
    wounded.hp = wounded.maxHp * 0.2;
    wounded.issueOrder({ kind: 'attack', entityId: victim.id }, true);
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    const order = wounded.orderQueue[0];
    return { kind: order?.kind ?? null, target: order?.target ?? null, base: { x: bx, z: bz } };
  });

  expect(out).not.toBeNull();
  expect(out!.kind).toBe('move');
  expect(out!.target).not.toBeNull();
  expect(Math.hypot(out!.target.x - out!.base.x, out!.target.z - out!.base.z)).toBeLessThan(1);
});

test('the AI sends its scout to explore', async ({ page }) => {
  await bootSkirmish(page);
  const order = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const scout = [...g.units.values()].find((u: any) => u.owner === 1 && u.kind === 'scout');
    scout.clearOrders();
    let t = 0;
    for (let i = 0; i < 420; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    return scout.orderQueue.map((o: any) => o.kind);
  });
  expect(order).toContain('patrol');
});

test('the AI builds a barracks and starts training soldiers in the opening', async ({ page }) => {
  // `noloop=1` makes the fixed-step opening deterministic (no frames before the test
  // stops the loop); the economy/army check still runs over 600 s of simulated time.
  await page.goto('/?seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.addAI(0);
    let t = 0;
    let everTrained = false;
    for (let i = 0; i < 60 * 600; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
      // the AI's opening economy oscillates, so sample whether it ever trained
      // rather than reading a single instant
      if (!everTrained) {
        everTrained = [...g.units.values()].some(
          (u: any) => u.owner === 0 && !u.dead && u.kind !== 'worker' && u.kind !== 'scout',
        );
      }
    }
    const hasBarracks = [...g.buildings.values()].some((b: any) => b.owner === 0 && b.kind === 'barracks' && !b.dead);
    return { hasBarracks, everTrained };
  });
  // before the fix the AI never accumulated the wood for a barracks and fielded nothing
  expect(out.hasBarracks).toBe(true);
  expect(out.everTrained).toBe(true);
});

test('the AI economy opens on a previously-stalled seed (783)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?play=1&seed=783&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.addAI(0, 'normal');
    let t = 0;
    let everTrained = false;
    for (let i = 0; i < 60 * 600; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
      if (!everTrained) {
        everTrained = [...g.units.values()].some(
          (u: any) => u.owner === 0 && !u.dead && u.kind !== 'worker' && u.kind !== 'scout',
        );
      }
    }
    const barracks = [...g.buildings.values()].some((b: any) => b.owner === 0 && b.kind === 'barracks' && !b.dead);
    return { everTrained, barracks };
  });
  expect(out.barracks, 'seed 783 should build a barracks within 10 simulated minutes').toBe(true);
  expect(out.everTrained, 'seed 783 should train a soldier within 10 simulated minutes').toBe(true);
});

test('the AI trains a mixed army (melee + ranged)', async ({ page }) => {
  await bootSkirmish(page);
  const cats = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.addAI(0);
    g.players[0].resources = { food: 9999, wood: 9999, silver: 9999, stone: 9999 };
    const c = g.playerCenter(0);
    g.spawnScriptedBuilding('barracks', 0, c.x + 12, c.z);
    g.spawnScriptedBuilding('arsenal', 0, c.x - 12, c.z);
    let t = 0;
    for (let i = 0; i < 60 * 150; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const out = new Set<string>();
    for (const u of g.units.values()) {
      if (u.owner !== 0 || u.dead) continue;
      if (u.kind === 'soldier') out.add('melee');
      if (u.kind === 'musketeer' || u.kind === 'rifleman') out.add('ranged');
    }
    return [...out];
  });
  expect(cats).toContain('melee');
  expect(cats).toContain('ranged');
});

test('the AI attacks enemy buildings when it has an army', async ({ page }) => {
  await bootSkirmish(page);
  const onCenter = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.addAI(0);
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center');
    for (let i = 0; i < 8; i++) g.spawnScriptedUnit('soldier', 0, enemy.pos.x + 6 + i, enemy.pos.z);
    let t = 0;
    for (let i = 0; i < 60 * 70; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    // the AI focuses the enemy center first
    return [...g.units.values()].filter(
      (u: any) =>
        u.owner === 0 && !u.dead && u.orderQueue[0]?.kind === 'attack' && u.orderQueue[0].entityId === enemy.id,
    ).length;
  });
  expect(onCenter).toBeGreaterThan(0);
});

test('a raiding AI (hard+) attacks enemy workers instead of buildings', async ({ page }) => {
  const firstTarget = async (difficulty: Difficulty): Promise<string> => {
    await bootSkirmish(page);
    return page.evaluate((d) => {
      const g = (window as unknown as { game: any }).game;
      g.addAI(0, d);
      // enemy worker at 15 (beyond the soldier's attack range) and a building at 10
      const soldier = g.spawnScriptedUnit('soldier', 0, 100, 100);
      soldier.clearOrders();
      const worker = g.spawnScriptedUnit('worker', 1, 115, 100);
      worker.clearOrders();
      const building = g.spawnScriptedBuilding('barracks', 1, 110, 100);
      let t = 0;
      for (let i = 0; i < 90; i++) {
        t += 1 / 60;
        g.update(1 / 60, t);
      }
      const id = soldier.orderQueue[0]?.entityId;
      return id === worker.id ? 'worker' : id === building.id ? 'building' : 'none';
    }, difficulty);
  };
  expect(await firstTarget('normal')).toBe('building');
  expect(await firstTarget('hard')).toBe('worker');
});

test('the AI mops up remaining buildings once the enemy has no army', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.addAI(0);
    // the enemy fields no units and only its center, so the army should focus it
    for (const u of g.units.values()) {
      if (u.owner === 1) u.die();
    }
    const p1 = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center');
    for (const b of g.buildings.values()) {
      if (b.owner === 1 && b.kind !== 'center') b.die();
    }
    // deploy the soldier next to the enemy base so it discovers the center (LOS-aware AI)
    const soldier = g.spawnScriptedUnit('soldier', 0, p1.pos.x + 6, p1.pos.z);
    soldier.clearOrders();
    let t = 0;
    for (let i = 0; i < 90; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    const order = soldier.orderQueue[0];
    return { kind: order?.kind ?? null, target: order?.entityId ?? null, p1Center: p1.id };
  });
  expect(out.kind).toBe('attack');
  expect(out.target).toBe(out.p1Center);
});

test('the AI focus-fires on one enemy unit', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.players[1].alive = false; // freeze the enemy AI
    for (const u of g.units.values()) {
      if (u.owner !== 0)
        u.die(); // clear the enemy's own units (incl. workers)
      else if (u.kind !== 'worker' && u.kind !== 'scout') u.die();
    }
    g.addAI(0);
    // deploy near the enemy base so the units are away from home (focus fire active)
    const p1 = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center');
    const bx = p1.pos.x;
    const bz = p1.pos.z;
    const soldiers = [
      [bx - 8, bz],
      [bx - 4, bz],
      [bx, bz],
    ].map(([x, z]) => {
      const u = g.spawnScriptedUnit('soldier', 0, x, z);
      u.clearOrders();
      return u;
    });
    // focus = enemy nearest the army centroid (bx-4, bz) -> e2 at (bx-6, bz)
    const e1 = g.spawnScriptedUnit('soldier', 1, bx + 2, bz);
    e1.clearOrders();
    e1.combatStance = 'pasivo';
    const e2 = g.spawnScriptedUnit('soldier', 1, bx - 6, bz);
    e2.clearOrders();
    e2.combatStance = 'pasivo';
    // the rightmost soldier starts attacking its nearest (e1) — focus fire must switch it to e2
    soldiers[2].issueOrder({ kind: 'attack', entityId: e1.id }, true);
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    return { focus: e2.id, targets: soldiers.map((s: any) => s.orderQueue[0]?.entityId ?? null) };
  });
  expect(out.targets).toEqual([out.focus, out.focus, out.focus]);
});

test('AI siege bombards buildings instead of chasing units', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.players[1].alive = false; // freeze the enemy AI
    for (const u of g.units.values()) {
      if (u.owner !== 0)
        u.die(); // clear the enemy's own units
      else if (u.kind !== 'worker' && u.kind !== 'scout') u.die();
    }
    g.addAI(0);
    const p0 = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    const bx = p0.pos.x;
    const bz = p0.pos.z + 4;
    const artillery = g.spawnScriptedUnit('artillery', 0, bx, bz);
    artillery.clearOrders();
    const range = artillery.stats.range;
    const building = g.spawnScriptedBuilding('barracks', 1, bx + range * 0.3, bz); // in range
    const distant = g.spawnScriptedUnit('soldier', 1, bx, bz + range * 0.8); // beyond self-defense
    distant.clearOrders();
    distant.combatStance = 'pasivo';
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    return { building: building.id, unit: distant.id, target: artillery.orderQueue[0]?.entityId ?? null };
  });
  expect(out.target).toBe(out.building);
});

test('AI siege self-defends against a unit at close range', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.players[1].alive = false;
    for (const u of g.units.values()) {
      if (u.owner !== 0) u.die();
      else if (u.kind !== 'worker' && u.kind !== 'scout') u.die();
    }
    g.addAI(0);
    const p0 = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    const bx = p0.pos.x;
    const bz = p0.pos.z + 4;
    const artillery = g.spawnScriptedUnit('artillery', 0, bx, bz);
    artillery.clearOrders();
    const range = artillery.stats.range;
    g.spawnScriptedBuilding('barracks', 1, bx + range * 0.3, bz);
    const close = g.spawnScriptedUnit('soldier', 1, bx, bz + range * 0.4); // within half range
    close.clearOrders();
    close.combatStance = 'pasivo';
    // check the order before the artillery's first shell lands
    let t = 0;
    for (let i = 0; i < 3; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    return { unit: close.id, target: artillery.orderQueue[0]?.entityId ?? null };
  });
  expect(out.target).toBe(out.unit);
});

test('idle AI workers take an available resource when the preferred one is gone', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    // exhaust every food source for the AI (nodes and farms)
    for (const n of g.resourceNodes.values()) {
      if (n.resource === 'food') {
        n.depleted = true;
        n.amount = 0;
      }
    }
    for (const b of g.buildings.values()) if (b.owner === 1 && b.isFarm) b.foodAmount = 0;
    // make the AI workers idle so the economy logic re-assigns them
    const aiWorkers = [...g.units.values()].filter((u: any) => u.owner === 1 && u.kind === 'worker');
    for (const w of aiWorkers) w.clearOrders();
    let t = 0;
    for (let i = 0; i < 60 * 6; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const kinds: Record<string, number> = {};
    let assigned = 0;
    for (const w of aiWorkers) {
      const o = w.orderQueue[0];
      if (!o || o.kind !== 'gather') continue;
      const n = g.resourceNodes.get(o.entityId);
      const res = n ? n.resource : 'farm';
      kinds[res] = (kinds[res] ?? 0) + 1;
      assigned++;
    }
    return { aiWorkers: aiWorkers.length, assigned, kinds };
  });
  expect(out.aiWorkers).toBeGreaterThan(0);
  // with no food left, idle workers must take another available resource
  expect(out.assigned).toBeGreaterThan(0);
  expect(out.kinds.food ?? 0).toBe(0);
});

test('idle AI workers keep gathering when wood is the exhausted resource', async ({ page }) => {
  await bootSkirmish(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    for (const n of g.resourceNodes.values()) {
      if (n.resource === 'wood') {
        n.depleted = true;
        n.amount = 0;
      }
    }
    const aiWorkers = [...g.units.values()].filter((u: any) => u.owner === 1 && u.kind === 'worker');
    for (const w of aiWorkers) w.clearOrders();
    let t = 0;
    for (let i = 0; i < 60 * 6; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const kinds: Record<string, number> = {};
    let assigned = 0;
    for (const w of aiWorkers) {
      const o = w.orderQueue[0];
      if (!o || o.kind !== 'gather') continue;
      const n = g.resourceNodes.get(o.entityId);
      const res = n ? n.resource : 'farm';
      kinds[res] = (kinds[res] ?? 0) + 1;
      assigned++;
    }
    return { aiWorkers: aiWorkers.length, assigned, kinds };
  });
  expect(out.aiWorkers).toBeGreaterThan(0);
  expect(out.assigned).toBeGreaterThan(0);
  expect(out.kinds.wood ?? 0).toBe(0);
});
