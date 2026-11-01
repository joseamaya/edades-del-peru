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

test('plays m7 by assaulting the realista command post with real orders', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m7_tupac_amaru&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const attackers = [...g.units.values()]
      .filter((u: any) => u.owner === 0 && !u.dead && u.tag !== 'tupac_amaru')
      .map((u: any) => u.id);
    g.executeCommand(
      { kind: 'order', unitIds: attackers, order: { kind: 'attack', entityId: enemy.id }, clear: true },
      false,
    );
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(620 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      asaltar: m.getObjectiveState('obj_asaltar') as string,
      tupac: m.getObjectiveState('obj_tupac') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.asaltar).toBe('completed');
  expect(out.tupac).not.toBe('failed');
  expect(out.won).toBe(true);
  expect(errors).toEqual([]);
});

test('plays m8 by holding Junín and Ayacucho with real orders', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m8_independencia&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const center = g.playerCenter(0) as { x: number; z: number };
    const sucre = [...g.units.values()].find((u: any) => u.tag === 'sucre') as any;
    const cavalry = [...g.units.values()]
      .filter((u: any) => u.owner === 0 && !u.dead && u.kind === 'cavalry')
      .map((u: any) => u.id);
    const rifles = [...g.units.values()]
      .filter((u: any) => u.owner === 0 && !u.dead && u.kind === 'rifleman' && u.tag !== 'sucre')
      .map((u: any) => u.id);
    const artillery = [...g.units.values()]
      .filter((u: any) => u.owner === 0 && !u.dead && u.kind === 'artillery')
      .map((u: any) => u.id);
    const move = (ids: number[], x: number, z: number) =>
      g.executeCommand({ kind: 'order', unitIds: ids, order: { kind: 'move', target: { x, z } }, clear: true }, false);
    const dt = 1 / 60;
    let t = 0;
    move([sucre.id], g.settings.mapSize * 0.1, g.settings.mapSize * 0.9);
    move(artillery, center.x, center.z + 15);
    move([...cavalry, ...rifles], enemy.pos.x - 30, enemy.pos.z);
    for (let i = 0; i < Math.ceil(110 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    const junin = m.getObjectiveState('obj_junin') as string;
    move(cavalry, enemy.pos.x, enemy.pos.z);
    move(rifles, enemy.pos.x - 12, enemy.pos.z + 10);
    for (let i = 0; i < Math.ceil(130 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      junin,
      ayacucho: m.getObjectiveState('obj_ayacucho') as string,
      sucre: m.getObjectiveState('obj_sucre') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.junin).toBe('completed');
  expect(out.ayacucho).toBe('completed');
  expect(out.sucre).not.toBe('failed');
  expect(out.won).toBe(true);
  expect(errors).toEqual([]);
});

test('plays m9 by defending the port and striking the Chilean command with real orders', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m9_guerra_pacifico&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const fort = [...g.buildings.values()].find((b: any) => b.tag === 'puerto') as any;
    const bolognesi = [...g.units.values()].find((u: any) => u.tag === 'bolognesi') as any;
    const soldiers = [...g.units.values()]
      .filter((u: any) => u.owner === 0 && !u.dead && u.kind === 'soldier')
      .map((u: any) => u.id);
    const rifles = [...g.units.values()]
      .filter((u: any) => u.owner === 0 && !u.dead && u.kind === 'rifleman' && u.tag !== 'bolognesi')
      .map((u: any) => u.id);
    const move = (ids: number[], x: number, z: number) =>
      g.executeCommand({ kind: 'order', unitIds: ids, order: { kind: 'move', target: { x, z } }, clear: true }, false);
    const attack = (ids: number[], entityId: number) =>
      g.executeCommand({ kind: 'order', unitIds: ids, order: { kind: 'attack', entityId }, clear: true }, false);
    const dt = 1 / 60;
    let t = 0;
    move([bolognesi.id], fort.pos.x - 2, fort.pos.z - 2);
    move(rifles, fort.pos.x + 4, fort.pos.z + 4);
    attack(soldiers, enemy.id);
    for (let i = 0; i < Math.ceil(620 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      puerto: m.getObjectiveState('obj_puerto') as string,
      bolognesi: m.getObjectiveState('obj_bolognesi') as string,
      resistir: m.getObjectiveState('obj_resistir') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.puerto).not.toBe('failed');
  expect(out.bolognesi).not.toBe('failed');
  expect(out.resistir).toBe('completed');
  expect(out.won).toBe(true);
  expect(errors).toEqual([]);
});

test('plays m6b by advancing to Quipaipan and defeating Huáscar with real orders', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m6b_guerra_civil&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const site = g.siteCenter as { x: number; z: number };
    const atahualpa = [...g.units.values()].find((u: any) => u.tag === 'atahualpa') as any;
    const army = [...g.units.values()]
      .filter((u: any) => u.owner === 0 && !u.dead && u.kind !== 'worker' && u.tag !== 'atahualpa')
      .map((u: any) => u.id);
    const move = (ids: number[], x: number, z: number) =>
      g.executeCommand({ kind: 'order', unitIds: ids, order: { kind: 'move', target: { x, z } }, clear: true }, false);
    const attack = (ids: number[], entityId: number) =>
      g.executeCommand({ kind: 'order', unitIds: ids, order: { kind: 'attack', entityId }, clear: true }, false);
    move([atahualpa.id], site.x - 35, site.z + 20);
    move(army, enemy.pos.x, enemy.pos.z + 18);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(220 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    const reach = m.getObjectiveState('obj_avanzar') as string;
    attack(army, enemy.id);
    for (let i = 0; i < Math.ceil(300 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      reach,
      quipaipan: m.getObjectiveState('obj_quipaipan') as string,
      atahualpa: m.getObjectiveState('obj_atahualpa') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.reach).toBe('completed');
  expect(out.quipaipan).toBe('completed');
  expect(out.atahualpa).not.toBe('failed');
  expect(out.won).toBe(true);
  expect(errors).toEqual([]);
});

test('plays m5 by holding Cusco and counterattacking with real orders', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m5_yahuar_pampa&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const attackers = [...g.units.values()]
      .filter((u: any) => u.owner === 0 && !u.dead && u.kind !== 'worker' && u.tag !== 'cusi_yupanqui')
      .map((u: any) => u.id);
    g.executeCommand(
      { kind: 'order', unitIds: attackers, order: { kind: 'attack', entityId: enemy.id }, clear: true },
      false,
    );
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(620 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      defend: m.getObjectiveState('obj_defend') as string,
      kill: m.getObjectiveState('obj_kill') as string,
      cusi: m.getObjectiveState('obj_cusi') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.defend).toBe('completed');
  expect(out.kill).toBe('completed');
  expect(out.cusi).not.toBe('failed');
  expect(out.won).toBe(true);
  expect(errors).toEqual([]);
});

test('plays m6 by advancing and cutting the canal with real orders', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m6_chimu_inca&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const ids = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead).map((u: any) => u.id);
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const canal = g.canalSite as { x: number; z: number } | null;
    const order = (x: number, z: number) =>
      g.executeCommand({ kind: 'order', unitIds: ids, order: { kind: 'move', target: { x, z } }, clear: true }, false);
    const dt = 1 / 60;
    let t = 0;
    order(enemy.pos.x - 18, enemy.pos.z);
    for (let i = 0; i < Math.ceil(180 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    const afterParamonga = m.getObjectiveState('obj_avanzar') as string;
    if (canal) order(canal.x, canal.z);
    for (let i = 0; i < Math.ceil(120 / dt) && !m.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      afterParamonga,
      canal: m.getObjectiveState('obj_canal') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.afterParamonga).toBe('completed');
  expect(out.canal).toBe('completed');
  expect(out.won).toBe(true);
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

test('plays m3 Moche with real movement, the canal and the exchange', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m3_moche_recuay&seed=400&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const overlay = page.locator('.ed-overlay', { hasText: 'La Frontera de los Valles' });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const anchor = g.siteAnchor as { x: number; z: number };
    const own = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead) as any[];
    const workers = own.filter((u) => u.kind === 'worker');
    const fighters = own.filter((u) => u.kind !== 'worker');
    if (!anchor || workers.length < 1 || fighters.length < 2) return { setup: false };

    g.toggleCanal();
    g.executeCommand(
      {
        kind: 'order',
        unitIds: [...fighters, workers[0]].map((u) => u.id),
        order: { kind: 'move', target: { x: anchor.x, z: anchor.z } },
        clear: true,
      },
      false,
    );

    const dt = 1 / 60;
    let t = 0;
    let reached = false;
    for (let i = 0; i < Math.ceil(115 / dt) && !g.mission.ended; i++) {
      if (!reached && Math.hypot(workers[0].pos.x - anchor.x, workers[0].pos.z - anchor.z) < 12) reached = true;
      g.update(dt, t);
      t += dt;
    }
    const held = g.mission.getObjectiveState('obj_huacas') as string;
    let traded = 0;
    for (let i = 0; i < 6; i++) if (g.makeTrade('moche_huaca_luna')) traded++;
    g.update(dt, t);
    return {
      setup: true,
      reached,
      held,
      traded,
      canal: g.mission.getObjectiveState('obj_canal') as string,
      trade: g.mission.getObjectiveState('obj_intercambio') as string,
      won: g.mission.won as boolean | null,
    };
  });

  expect(out.setup, JSON.stringify(out)).toBe(true);
  expect(out.reached, JSON.stringify(out)).toBe(true);
  expect(out.canal).toBe('completed');
  expect(out.held).toBe('completed');
  expect(out.traded).toBeGreaterThanOrEqual(1);
  expect(out.trade).toBe('completed');
  expect(out.won, JSON.stringify(out)).toBe(true);
  expect(errors).toEqual([]);
});

test('plays m4 Wari with real construction and the provincial network', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const overlay = page.locator('.ed-overlay', { hasText: 'El Horizonte Medio' });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any[];
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center') as any;
    if (!center || workers.length < 4) return { setup: false, workers: workers.length };

    const nearest = (kind: string, from: any) =>
      ([...g.resourceNodes.values()].filter((n: any) => !n.dead && n.resource === kind) as any[]).sort(
        (a: any, b: any) =>
          (a.pos.x - from.pos.x) ** 2 +
          (a.pos.z - from.pos.z) ** 2 -
          ((b.pos.x - from.pos.x) ** 2 + (b.pos.z - from.pos.z) ** 2),
      )[0];
    const orderGather = (worker: any, kind: string) => {
      const node = nearest(kind, worker);
      if (node) {
        g.executeCommand(
          { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: node.id }, clear: true },
          false,
        );
      }
      return !!node;
    };
    const placeAndBuild = (kind: string, x: number, z: number, worker: any): any => {
      const spot = g.findFreeSpot(x, z, kind === 'farm' ? 3 : 5);
      if (!spot || !g.executeCommand({ kind: 'place', building: kind, x: spot.x, z: spot.z })) return null;
      const building = [...g.buildings.values()].find(
        (b: any) => b.owner === 0 && b.kind === kind && !b.dead && b.pos.x === spot.x && b.pos.z === spot.z,
      ) as any;
      if (!building) return null;
      g.executeCommand(
        { kind: 'order', unitIds: [worker.id], order: { kind: 'build', entityId: building.id }, clear: true },
        false,
      );
      return building;
    };

    const farms = [
      placeAndBuild('farm', center.pos.x + 10, center.pos.z + 4, workers[0]),
      placeAndBuild('farm', center.pos.x - 10, center.pos.z + 4, workers[1]),
    ];
    if (!farms[0] || !farms[1]) return { setup: false, reason: 'farm placement' };
    orderGather(workers[2], 'wood');
    orderGather(workers[3], 'wood');
    orderGather(workers[4] ?? workers[3], 'silver');

    const site = g.siteCenter as { x: number; z: number };
    const network = g.mission.def.objectives.find((o: any) => o.id === 'obj_red');
    const nodes = network.nodes.map((n: any) => ({ x: site.x + n.dx, z: site.z + n.dz }));
    const markets: any[] = [];
    const dt = 1 / 60;
    let t = 0;
    let reached = false;
    for (let i = 0; i < Math.ceil(620 / dt) && !g.mission.ended; i++) {
      if (markets.length < 2 && g.players[0].resources.wood >= 120 && g.players[0].resources.silver >= 40) {
        const builder = markets.length === 0 ? workers[2] : workers[3];
        const market = placeAndBuild('market', nodes[markets.length].x, nodes[markets.length].z, builder);
        if (market) markets.push(market);
      }
      if (markets.length === 1 && g.players[0].resources.wood < 120) {
        orderGather(workers[3], 'wood');
        orderGather(workers[4] ?? workers[3], 'wood');
      }
      if (farms.every((f) => f?.constructionComplete) && workers[0].orderQueue.length === 0) {
        for (const [idx, worker] of [workers[0], workers[1]].entries()) {
          const farm = farms[idx];
          if (farm && !farm.dead) {
            g.executeCommand(
              { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: farm.id }, clear: true },
              false,
            );
          }
        }
      }
      if (markets.length === 2 && markets.every((m) => m.constructionComplete) && !reached) {
        const mover = workers[4] ?? workers[3];
        g.executeCommand(
          {
            kind: 'order',
            unitIds: [mover.id],
            order: { kind: 'move', target: { x: nodes[0].x, z: nodes[0].z } },
            clear: true,
          },
          false,
        );
        reached = true;
      }
      g.update(dt, t);
      t += dt;
    }
    return {
      setup: true,
      farms: farms.every((f) => f?.constructionComplete),
      markets: markets.length,
      marketsComplete: markets.every((m) => m.constructionComplete),
      reached,
      resources: { ...g.players[0].resources },
      objectives: Object.fromEntries(
        g.mission.def.objectives.map((o: any) => [o.id, g.mission.getObjectiveState(o.id)]),
      ),
      won: g.mission.won as boolean | null,
    };
  });

  expect(out.setup, JSON.stringify(out)).toBe(true);
  expect(out.farms, JSON.stringify(out)).toBe(true);
  expect(out.markets, JSON.stringify(out)).toBe(2);
  expect(out.marketsComplete, JSON.stringify(out)).toBe(true);
  expect(out.reached, JSON.stringify(out)).toBe(true);
  expect(out.objectives.obj_andenes).toBe('completed');
  expect(out.objectives.obj_red).toBe('completed');
  expect(out.objectives.obj_suministros).toBe('completed');
  expect(out.objectives.obj_frontera).toBe('completed');
  expect(out.objectives.obj_sostener).toBe('completed');
  expect(out.won, JSON.stringify(out)).toBe(true);
  expect(errors).toEqual([]);
});
