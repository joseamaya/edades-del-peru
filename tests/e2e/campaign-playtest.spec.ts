import { test, expect } from '@playwright/test';

/**
 * A bounded campaign playtest that does not satisfy objectives directly.
 * It issues ordinary gather commands to the player's workers and lets the
 * economy and the enemy AI run; the enemy must keep producing units while the
 * player's gatherers bring resources home.
 */
test('plays m7 with real gathering and enemy AI without objective cheats', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m7_tupac_amaru&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();

    const nodes = [...g.resourceNodes.values()].filter((n: any) => !n.dead && n.resource === 'wood') as any[];
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any[];
    const nearest = (worker: any) =>
      nodes.reduce((best: any, node: any) => {
        if (!best) return node;
        const dx = node.pos.x - worker.pos.x;
        const dz = node.pos.z - worker.pos.z;
        const bx = best.pos.x - worker.pos.x;
        const bz = best.pos.z - worker.pos.z;
        return dx * dx + dz * dz < bx * bx + bz * bz ? node : best;
      }, null);

    const before = { ...g.players[0].resources };
    for (const worker of workers) {
      const node = nearest(worker);
      if (node) {
        g.executeCommand(
          { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: node.id }, clear: true },
          false,
        );
      }
    }

    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(45 / dt) && !g.mission.ended; i++) {
      g.update(dt, t);
      t += dt;
    }

    const enemyWorkers = [...g.units.values()].filter(
      (u: any) => u.owner === 1 && u.kind === 'worker' && !u.dead,
    ) as any[];
    return {
      before,
      after: { ...g.players[0].resources },
      workers: workers.length,
      enemyWorkers: enemyWorkers.length,
      enemyWorking: enemyWorkers.some((u: any) => u.orderQueue.some((o: any) => o.kind === 'gather')),
      enemyCreated: g.players[1].stats.created as number,
      ended: g.mission.ended as boolean,
      won: g.mission.won as boolean | null,
    };
  });

  expect(out.workers).toBeGreaterThan(0);
  expect(out.after.wood, 'the player economy did not gather wood').toBeGreaterThan(out.before.wood);
  expect(out.enemyWorkers, 'the AI lost its economy').toBeGreaterThan(0);
  expect(out.enemyWorking, 'the AI did not assign gatherers').toBe(true);
  expect(out.enemyCreated, 'the AI did not train units').toBeGreaterThanOrEqual(1);
  expect(out.ended).toBe(false);
  expect(out.won).toBe(null);
  expect(errors).toEqual([]);
});

/**
 * Caral is the campaign's gold standard: this plays the mission through the
 * ordinary command layer (build orders, gather orders and a scout move) instead
 * of satisfying objectives or spawning finished buildings directly.
 */
test('plays m1 Caral with real construction and gathering, without objective cheats', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&noloop=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();

    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any[];
    const scout = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'scout' && !u.dead) as any;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center') as any;
    if (!center || workers.length < 3 || !scout) return { setup: false };

    const buildings: any[] = [];
    const placeAndBuild = (kind: string, dx: number, dz: number, worker: any): boolean => {
      const spot = g.findFreeSpot(center.pos.x + dx, center.pos.z + dz, kind === 'farm' ? 3 : 2);
      if (!spot || !g.executeCommand({ kind: 'place', building: kind, x: spot.x, z: spot.z })) return false;
      const building = [...g.buildings.values()].find(
        (b: any) => b.owner === 0 && b.kind === kind && !b.dead && b.pos.x === spot.x && b.pos.z === spot.z,
      ) as any;
      if (!building) return false;
      buildings.push(building);
      g.executeCommand(
        { kind: 'order', unitIds: [worker.id], order: { kind: 'build', entityId: building.id }, clear: true },
        false,
      );
      return true;
    };

    if (!placeAndBuild('farm', 11, 2, workers[0])) return { setup: false };
    if (!placeAndBuild('farm', -11, 2, workers[1])) return { setup: false };
    if (!placeAndBuild('mill', 0, 12, workers[2])) return { setup: false };

    // Keep the fourth worker on the nearest berry patch while the other three build.
    const berry = [...g.resourceNodes.values()]
      .filter((n: any) => !n.dead && n.resource === 'food' && n.kind === 'berry')
      .sort(
        (a: any, b: any) =>
          (a.pos.x - center.pos.x) ** 2 +
          (a.pos.z - center.pos.z) ** 2 -
          ((b.pos.x - center.pos.x) ** 2 + (b.pos.z - center.pos.z) ** 2),
      )[0] as any;
    const berryWorker = workers[3];
    if (berry && berryWorker) {
      g.executeCommand(
        { kind: 'order', unitIds: [berryWorker.id], order: { kind: 'gather', entityId: berry.id }, clear: true },
        false,
      );
    }

    const target = g.mission.getObjectiveAnchor('obj_complejo');
    if (!target) return { setup: false };
    g.executeCommand(
      {
        kind: 'order',
        unitIds: [scout.id],
        order: { kind: 'move', target: { x: target.x, z: target.z } },
        clear: true,
      },
      false,
    );

    const dt = 1 / 60;
    let t = 0;
    let observed = false;
    for (let i = 0; i < Math.ceil(330 / dt) && !g.mission.ended; i++) {
      if (!observed && Math.hypot(scout.pos.x - target.x, scout.pos.z - target.z) < 14) {
        g.visitHeritage('caral_pyramid_mayor');
        observed = true;
      }
      // after the three builders finish, put two of them on the farms
      if (
        buildings.length === 3 &&
        buildings.every((b) => b.constructionComplete) &&
        workers[0].orderQueue.length === 0
      ) {
        for (const [farmIndex, worker] of [workers[0], workers[1]].entries()) {
          const farm = buildings[farmIndex];
          if (farm && !farm.dead) {
            g.executeCommand(
              { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: farm.id }, clear: true },
              false,
            );
          }
        }
      }
      g.update(dt, t);
      t += dt;
    }

    return {
      setup: true,
      won: g.mission.won as boolean | null,
      ended: g.mission.ended as boolean,
      objectives: Object.fromEntries(
        g.mission.def.objectives.map((o: any) => [o.id, g.mission.getObjectiveState(o.id)]),
      ),
    };
  });

  expect(out.setup, 'Caral playtest could not set up its base').toBe(true);
  expect(out.ended, JSON.stringify(out)).toBe(true);
  expect(out.won, JSON.stringify(out)).toBe(true);
  expect(out.objectives.obj_agricultura).toBe('completed');
  expect(out.objectives.obj_almacenamiento).toBe('completed');
  expect(out.objectives.obj_complejo).toBe('completed');
  expect(out.objectives.obj_alimento).toBe('completed');
  expect(out.objectives.obj_sostener).toBe('completed');
  expect(errors).toEqual([]);
});

test('plays m2 Chavín with real construction and the offering mechanic', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m2_chavin&seed=900&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const overlay = page.locator('.ed-overlay', { hasText: 'El Oráculo de Chavín' });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any[];
    const anchor = g.siteAnchor as { x: number; z: number };
    if (workers.length < 2 || !anchor) return { setup: false };

    const spot = g.findFreeSpot(anchor.x, anchor.z + 34, 5);
    if (!spot || !g.executeCommand({ kind: 'place', building: 'market', x: spot.x, z: spot.z })) {
      return { setup: false, reason: 'market placement' };
    }
    const market = [...g.buildings.values()].find(
      (b: any) => b.owner === 0 && b.kind === 'market' && !b.dead && b.pos.x === spot.x && b.pos.z === spot.z,
    ) as any;
    if (!market) return { setup: false, reason: 'market missing' };
    g.executeCommand(
      { kind: 'order', unitIds: [workers[0].id], order: { kind: 'build', entityId: market.id }, clear: true },
      false,
    );
    const holder = workers[1];
    g.executeCommand(
      {
        kind: 'order',
        unitIds: [holder.id],
        order: { kind: 'move', target: { x: anchor.x, z: anchor.z } },
        clear: true,
      },
      false,
    );
    const dt = 1 / 60;
    let t = 0;
    let offered = false;
    let reached = false;
    for (let i = 0; i < Math.ceil(500 / dt) && !g.mission.ended; i++) {
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
      if (!reached && Math.hypot(holder.pos.x - anchor.x, holder.pos.z - anchor.z) < 8) reached = true;
      if (!offered && market.constructionComplete && reached) {
        for (let k = 0; k < 5; k++) g.makeOffering('chavin_edificio_b');
        offered = true;
      }
      g.update(dt, t);
      t += dt;
    }
    return {
      setup: true,
      offered,
      reached,
      marketComplete: market.constructionComplete,
      won: g.mission.won,
      ended: g.mission.ended,
      states: Object.fromEntries(g.mission.def.objectives.map((o: any) => [o.id, g.mission.getObjectiveState(o.id)])),
    };
  });

  expect(out.setup, JSON.stringify(out)).toBe(true);
  expect(out.reached, JSON.stringify(out)).toBe(true);
  expect(out.offered, JSON.stringify(out)).toBe(true);
  expect(out.marketComplete, JSON.stringify(out)).toBe(true);
  expect(out.states.obj_ofrendas).toBe('completed');
  expect(out.states.obj_peregrinaje).toBe('completed');
  expect(out.states.obj_feria).toBe('completed');
  expect(out.states.obj_sostener).toBe('completed');
  expect(out.won, JSON.stringify(out)).toBe(true);
  expect(errors).toEqual([]);
});
