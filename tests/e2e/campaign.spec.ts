import { test, expect } from '@playwright/test';

test('shows the historical prologue before the campaign', async ({ page }) => {
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const intro = page.locator('.ed-cinematic', { hasText: 'CAMPAÑA I' });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('una de las primeras civilizaciones del mundo');
  await intro.getByRole('button', { name: /Ver misiones/ }).click();
  const hub = page.locator('.ed-campaign-panel');
  await expect(hub).toBeVisible();
  await expect(hub).toContainText('Culturas Preincas');
  await expect(hub.getByRole('button', { name: /Jugar La Ciudad Sagrada/ })).toBeVisible();
  await expect(hub).toContainText('Próximamente');
});

test('the mission briefing includes context and sources', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await expect(overlay).toContainText('Contexto');
  await expect(overlay).toContainText('¿Sabías que…?');
  await expect(overlay.getByText('Fuentes históricas')).toBeVisible();
  await expect(overlay).toContainText('Observa la Gran Pirámide');
  // the surplus, canal, tour and assembly are discoveries, not spoiled here
  await expect(overlay).not.toContainText('Construye un depósito');
  await expect(overlay).not.toContainText('Reúne 500');
  await expect(overlay).not.toContainText('Abre la compuerta');
  await expect(overlay).not.toContainText('Recorre los seis');
  await expect(overlay).not.toContainText('Convoca una asamblea');
});

test('the codex opens with periods, civilizations and dossiers', async ({ page }) => {
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Códice/ }).click();
  const codex = page.locator('#ed-codex');
  await expect(codex).toBeVisible();
  await expect(codex).toContainText('Códice del Perú');
  await codex.getByRole('button', { name: /Civilizaciones/ }).click();
  await expect(codex.locator('.ed-codex-nav')).toContainText('Caral-Supe');
  await codex.getByRole('button', { name: /Campañas/ }).click();
  await expect(codex.locator('.ed-codex-nav')).toContainText('La Ciudad Sagrada');
  await expect(codex.locator('.ed-codex-nav')).toContainText('El Oráculo de Chavín');
  await expect(codex.locator('.ed-codex-nav')).toContainText('La Frontera de los Valles');
  await expect(codex.locator('.ed-codex-nav')).toContainText('El Horizonte Medio');
  await codex.getByRole('button', { name: /Dossiers/ }).click();
  await expect(codex.locator('.ed-codex-content')).toContainText('Fuentes');
});

test('every campaign mission shows its educational epilogue on victory', async ({ context }) => {
  for (const mission of [
    'm2_chavin',
    'm3_moche_recuay',
    'm4_wari',
    'm5_yahuar_pampa',
    'm6_chimu_inca',
    'm7_tupac_amaru',
    'm8_independencia',
    'm9_guerra_pacifico',
  ]) {
    const page = await context.newPage();
    await page.goto(`/?mission=${mission}&seed=777&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
    const victory = page.locator('.ed-overlay', { hasText: 'VICTORIA' });
    await expect(victory).toBeVisible({ timeout: 15_000 });
    await expect(victory).toContainText('Epílogo');
    await expect(victory).toContainText('Códice');
    await page.close();
  }
});

test('the tutorial guides in the first mission', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  const tutorial = page.locator('#ed-tutorial');
  // the first step appears after ~1.2s of game time; be generous on slow runners
  await expect(tutorial).toBeVisible({ timeout: 30_000 });
  await expect(tutorial).toContainText('Selecciona a tus obreros');
  await expect(tutorial).toContainText('Paso 1 / 6');
});

test('Caral guarantees coastal fishing grounds for the tutorial', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const fish = await page.evaluate(
    () =>
      [...(window as unknown as { game: any }).game.resourceNodes.values()].filter(
        (n: any) => n.kind === 'fishing' && !n.dead,
      ).length,
  );
  expect(fish).toBeGreaterThan(0);
});

test('the Caral mission closes with a narrative epilogue, not a quiz', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&noloop=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.players[0].resources.food = 500;
    const c = g.playerCenter(0);
    g.spawnScriptedBuilding('farm', 0, c.x + 6, c.z + 6);
    g.spawnScriptedBuilding('farm', 0, c.x + 9, c.z + 6);
    g.spawnScriptedBuilding('mill', 0, c.x + 12, c.z + 6);
    const target = g.mission.getObjectiveAnchor('obj_complejo');
    const scout = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'scout');
    if (target && scout) scout.pos.set(target.x, g.terrain.getHeight(target.x, target.z), target.z);
    g.visitHeritage('caral_pyramid_mayor');
    const m = g.mission;
    const dt = 1 / 60;
    for (let i = 0; i < Math.ceil(310 / dt) && !m.ended; i++) {
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      g.update(dt, i * dt);
    }
    return m.won;
  });
  const victory = page.locator('.ed-overlay', { hasText: 'VICTORIA' });
  await expect(victory).toBeVisible({ timeout: 15_000 });
  await expect(victory).toContainText('Epílogo');
  await expect(victory).toContainText('Códice');
  await expect(victory).not.toContainText('Pregunta');
  await expect(victory).not.toContainText('Puntaje');
});

test('the missions with corrected rosters boot with units and no errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ids = ['m3_moche_recuay', 'm5_yahuar_pampa', 'm6_chimu_inca', 'm7_tupac_amaru', 'm9_guerra_pacifico'];
  for (const id of ids) {
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    const info = await page.evaluate(() => {
      const g = (window as unknown as { game: { units: Map<number, unknown>; buildings: Map<number, unknown> } }).game;
      return { units: g.units.size, buildings: g.buildings.size };
    });
    expect(info.units, `${id} has no units`).toBeGreaterThan(0);
    expect(info.buildings, `${id} has no buildings`).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('a mission roster restriction blocks disallowed units', async ({ page }) => {
  await page.goto('/?mission=m9_guerra_pacifico&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const c = g.playerCenter(0);
    const b = g.spawnScriptedBuilding('barracks', 0, c.x + 6, c.z + 6);
    // the naval mission has no siege train, but infantry is allowed
    return { artillery: g.trainUnit(b.id, 'artillery'), soldier: g.trainUnit(b.id, 'soldier') };
  });
  expect(out.artillery).toBe(false);
  expect(out.soldier).toBe(true);
});

test('the expansion objective needs the building at the frontier', async ({ page }) => {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const m = g.mission;
    const o = m.def.objectives.find((x: any) => x.id === 'obj_centro');
    const centerOf = (owner: number): { x: number; z: number } => {
      const c = [...g.buildings.values()].find((b: any) => b.owner === owner && b.kind === 'center' && !b.dead);
      return c ? { x: c.pos.x, z: c.pos.z } : { x: g.settings.mapSize / 2, z: g.settings.mapSize / 2 };
    };
    const base = o.pos.ref === 'enemy' ? centerOf(1) : centerOf(0);
    const tp = { x: base.x + o.pos.dx, z: base.z + o.pos.dz };
    const home = centerOf(0);
    // a market at home does not satisfy the frontier objective
    g.spawnScriptedBuilding('market', 0, home.x + 8, home.z + 8);
    m.update(0.1, 0);
    const atHome = m.getObjectiveState('obj_centro');
    // one at the frontier does
    g.spawnScriptedBuilding('market', 0, tp.x, tp.z);
    m.update(0.1, 0);
    const atFrontier = m.getObjectiveState('obj_centro');
    return { atHome, atFrontier };
  });
  expect(out.atHome).not.toBe('completed');
  expect(out.atFrontier).toBe('completed');
});

test('m6 cuts the canal to force Chan Chan to surrender', async ({ page }) => {
  await page.goto('/?mission=m6_chimu_inca&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const tupac = [...g.units.values()].find((u: any) => u.tag === 'tupac_yupanqui') as any;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const canal = g.canalSite as { x: number; z: number } | null;
    const setPos = (x: number, z: number) => tupac.pos.set(x, g.terrain.getHeight(x, z), z);
    setPos(enemy.pos.x - 18, enemy.pos.z);
    g.update(1 / 60, 0);
    const afterParamonga = m.getObjectiveState('obj_canal') as string;
    if (!canal) return { afterParamonga, canal: false, won: m.won as boolean | null };
    setPos(canal.x, canal.z);
    g.update(1 / 60, 0);
    return {
      afterParamonga,
      canal: true,
      canalVisual: !!g.scene.getObjectByName('canal'),
      waterVisual: !!g.scene.getObjectByName('canal_water'),
      gateVisual: !!g.scene.getObjectByName('canal_gate'),
      chanChanDecor: !!g.scene.getObjectByName('mission_decor_chimu_compound'),
      canalObjective: m.getObjectiveState('obj_canal') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.canal).toBe(true);
  expect(out.afterParamonga).toBe('activo');
  expect(out.canalVisual).toBe(true);
  expect(out.waterVisual).toBe(true);
  expect(out.gateVisual).toBe(true);
  expect(out.chanChanDecor).toBe(true);
  expect(out.canalObjective).toBe('completed');
  expect(out.won).toBe(true);
});

test('authored campaign geography spawns its local base and features', async ({ context }) => {
  const cases = [
    { id: 'm2_chavin', river: true, decor: null, canal: false },
    { id: 'm3_moche_recuay', flats: true, decor: 'mission_decor_recuay_pashash', canal: false },
    { id: 'm4_wari', flats: true, decor: null, canal: false },
    { id: 'm5_yahuar_pampa', flats: true, decor: 'mission_decor_chanca_fortress', canal: false },
    { id: 'm6_chimu_inca', flats: true, decor: 'mission_decor_chimu_compound', canal: true },
    { id: 'm7_tupac_amaru', flats: true, decor: 'mission_decor_colonial_church', canal: false },
    { id: 'm8_independencia', flats: true, decor: 'mission_decor_colonial_church', canal: false },
    { id: 'm9_guerra_pacifico', flats: true, decor: 'mission_decor_chile_apostadero', canal: false },
  ];
  for (const item of cases) {
    const page = await context.newPage();
    await page.goto(`/?mission=${item.id}&seed=777&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
      timeout: 30_000,
    });
    const out = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const center = g.playerCenter(0);
      return {
        water: center ? g.terrain.isWater(center.x, center.z) : true,
        buildable: center ? g.terrain.isBuildable(center.x, center.z) : false,
        river: !!g.missionLayout?.terrain?.river,
        flats: g.missionLayout?.terrain?.flats?.length ?? 0,
        decor: g.scenarioDecor?.name ?? null,
        canal: !!g.canalSite,
      };
    });
    expect(out.water, `${item.id} starts in water`).toBe(false);
    expect(out.buildable, `${item.id} start is not buildable`).toBe(true);
    if (item.river) expect(out.river).toBe(true);
    if (item.flats) expect(out.flats).toBeGreaterThan(0);
    if (item.decor) expect(out.decor).toBe(item.decor);
    if (item.canal !== undefined) expect(out.canal).toBe(item.canal);
    await page.close();
  }
});

test('m2 offerings open the pilgrimage and reward the oracle', async ({ page }) => {
  await page.goto('/?mission=m2_chavin&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const anchor = g.siteAnchor as { x: number; z: number } | null;
    const unit = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead) as any;
    if (!anchor || !unit) return { anchor: false, unit: false };
    unit.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    for (let i = 0; i < 5; i++) g.makeOffering('chavin_edificio_b');
    g.update(1 / 60, 0);
    const afterOffers = {
      silver: g.players[0].resources.silver as number,
      offerings: m.getObjectiveState('obj_ofrendas') as string,
      pilgrimage: m.getObjectiveState('obj_peregrinaje') as string,
      feria: m.getObjectiveState('obj_feria') as string,
    };
    const dt = 1 / 60;
    for (let i = 0; i < Math.ceil(65 / dt) && !m.ended; i++) {
      unit.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
      g.update(dt, i * dt);
    }
    return {
      anchor: true,
      unit: true,
      afterOffers,
      pilgrimage: m.getObjectiveState('obj_peregrinaje') as string,
      silver: g.players[0].resources.silver as number,
    };
  });
  expect(out.anchor).toBe(true);
  expect(out.unit).toBe(true);
  expect(out.afterOffers.offerings).toBe('completed');
  expect(out.afterOffers.pilgrimage).toBe('activo');
  expect(out.afterOffers.feria).toBe('activo');
  expect(out.pilgrimage).toBe('completed');
  expect(out.silver).toBeGreaterThan(out.afterOffers.silver);
});

test('m4 two centers open the contested frontier', async ({ page }) => {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center') as any;
    g.spawnScriptedBuilding('market', 0, center.pos.x + 38, center.pos.z);
    g.spawnScriptedBuilding('market', 0, center.pos.x - 30, center.pos.z + 26);
    g.update(1 / 60, 0);
    const active = m.getObjectiveState('obj_frontera') as string;
    const unit = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead) as any;
    const dt = 1 / 60;
    for (let i = 0; i < Math.ceil(65 / dt) && !m.ended; i++) {
      unit.pos.set(center.pos.x + 38, g.terrain.getHeight(center.pos.x + 38, center.pos.z), center.pos.z);
      g.update(dt, i * dt);
    }
    return {
      center1: m.getObjectiveState('obj_centro') as string,
      center2: m.getObjectiveState('obj_centro_2') as string,
      active,
      frontier: m.getObjectiveState('obj_frontera') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.center1).toBe('completed');
  expect(out.center2).toBe('completed');
  expect(out.active).toBe('activo');
  expect(out.frontier).toBe('completed');
  expect(out.won).not.toBe(true);
});

test('m9 land defense fails when Bolognesi falls', async ({ page }) => {
  await page.goto('/?mission=m9_guerra_pacifico&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const bolognesi = [...g.units.values()].find((u: any) => u.tag === 'bolognesi') as any;
    const before = {
      active: m.getObjectiveState('obj_bolognesi') as string,
      alive: !!bolognesi && !bolognesi.dead,
    };
    bolognesi.die();
    g.update(1 / 60, 0);
    return {
      before,
      after: m.getObjectiveState('obj_bolognesi') as string,
      ended: m.ended as boolean,
      won: m.won as boolean | null,
    };
  });
  expect(out.before.alive).toBe(true);
  expect(out.before.active).toBe('activo');
  expect(out.after).toBe('failed');
  expect(out.ended).toBe(true);
  expect(out.won).toBe(false);
});

test('m8 holds Junín and then Ayacucho with Sucre alive', async ({ page }) => {
  await page.goto('/?mission=m8_independencia&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const cavalry = [...g.units.values()].find((u: any) => u.kind === 'cavalry' && u.owner === 0) as any;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const move = (x: number, z: number) => cavalry.pos.set(x, g.terrain.getHeight(x, z), z);
    const dt = 1 / 60;
    // Junín: hold the forward position for 90s.
    for (let i = 0; i < Math.ceil(95 / dt) && !m.ended; i++) {
      move(enemy.pos.x - 30, enemy.pos.z);
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      g.update(dt, i * dt);
    }
    const afterJunin = {
      junin: m.getObjectiveState('obj_junin'),
      ayacucho: m.getObjectiveState('obj_ayacucho'),
      won: m.won as boolean | null,
    };
    // Ayacucho: hold the decisive position for 120s.
    for (let i = 0; i < Math.ceil(125 / dt) && !m.ended; i++) {
      move(enemy.pos.x, enemy.pos.z);
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      g.update(dt, i * dt);
    }
    return {
      afterJunin,
      ayacucho: m.getObjectiveState('obj_ayacucho'),
      sucre: m.getObjectiveState('obj_sucre'),
      won: m.won as boolean | null,
    };
  });
  expect(out.afterJunin.junin).toBe('completed');
  expect(out.afterJunin.ayacucho).toBe('activo');
  expect(out.afterJunin.won).not.toBe(true);
  expect(out.ayacucho).toBe('completed');
  expect(out.sucre).not.toBe('failed');
  expect(out.won).toBe(true);
});

test('a strategic choice wins through either branch', async ({ page }) => {
  const boot = async () => {
    await page.goto('/?mission=m7_tupac_amaru&seed=777&fog=0&low=1&noloop=1');
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
  };

  // branch A — assault: destroy the realista command post
  await boot();
  const assault = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const before = g.mission.won as boolean | null;
    for (const b of g.buildings.values()) if (b.owner !== 0 && b.tag === 'centro_realista') b.die();
    g.update(1 / 60, 0);
    return { before, after: g.mission.won as boolean | null };
  });
  expect(assault.before).not.toBe(true);
  expect(assault.after).toBe(true);

  // branch B — siege: hold out until the clock expires
  await boot();
  const siege = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const dt = 1 / 60;
    for (let i = 0; i < Math.ceil(620 / dt) && !m.ended; i++) {
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      m.update(dt, i * dt);
    }
    return m.won as boolean | null;
  });
  expect(siege).toBe(true);
});

test('the campaign hub shows preinca progress and its four missions', async ({ page }) => {
  // legacy numeric progress migrates to the first two released missions
  await page.addInitScript(() => {
    localStorage.setItem('peru-campaign', '2');
    localStorage.setItem('peru-campaign-intro-preinca', '1');
  });
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const menu = page.locator('.ed-campaign-panel');
  await expect(menu).toContainText('Culturas Preincas');
  await expect(menu).toContainText('2 / 4 misiones completadas');
  await expect(menu).toContainText('✓ La Ciudad Sagrada');
  await expect(menu).toContainText('✓ El Oráculo de Chavín');
  await expect(menu.getByRole('button', { name: /Jugar La Ciudad Sagrada/ })).toHaveCount(0);
  await expect(menu.getByRole('button', { name: /Jugar La Frontera de los Valles/ })).toBeVisible();
  await expect(menu).toContainText('El Tahuantinsuyo');
  await expect(menu).toContainText('En preparación');
});

test('the campaign hub keeps future campaigns as coming soon', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('peru-campaign', '9');
    localStorage.setItem('peru-campaign-intro-preinca', '1');
  });
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const menu = page.locator('.ed-campaign-panel');
  await expect(menu).toContainText('4 / 4 misiones completadas');
  for (const title of [
    '✓ La Ciudad Sagrada',
    '✓ El Oráculo de Chavín',
    '✓ La Frontera de los Valles',
    '✓ El Horizonte Medio',
  ]) {
    await expect(menu).toContainText(title);
  }
  for (const title of ['El Tahuantinsuyo', 'El Virreinato', 'Independencia y República']) {
    await expect(menu).toContainText(title);
  }
  await expect(menu.getByRole('button', { name: /Continuar campaña/ })).toHaveCount(0);
});

test('Caral opens with a chapter card and chains into Chavín', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const briefing = page.locator('.ed-briefing');
  await expect(briefing).toBeVisible({ timeout: 30_000 });
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  const card = page.locator('.ed-mission-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('La Ciudad Sagrada');
  await page.evaluate(() => document.querySelector('.ed-mission-card')?.remove());
  await expect(card).toHaveCount(0);

  await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
  const victory = page.locator('.ed-epilogue');
  await expect(victory).toContainText('Continuar: El Oráculo de Chavín');
  await victory.getByRole('button', { name: /Continuar: El Oráculo de Chavín/ }).click();
  await page.waitForURL(/mission=m2_chavin/);
  await expect(page.locator('.ed-overlay', { hasText: 'El Oráculo de Chavín' })).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => localStorage.getItem('peru-campaign'))).toContain('m1_caral');
});

test('Wari closes the preinca chapter', async ({ page }) => {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
  const victory = page.locator('.ed-epilogue');
  await expect(victory).toContainText('Fin de la primera campaña');
  await expect(victory.getByRole('button', { name: /Volver a campañas/ })).toBeVisible();
});

test('a peaceful mission briefing shows no rival side', async ({ page }) => {
  for (const mission of ['m1_caral', 'm2_chavin', 'm4_wari']) {
    await page.goto(`/?mission=${mission}&seed=777&fog=0&low=1`);
    const overlay = page.locator('.ed-overlay').filter({ hasText: 'OBJETIVOS' });
    await expect(overlay).toBeVisible({ timeout: 30_000 });
    await expect(overlay).toContainText('Bandos:');
    await expect(overlay).toContainText('sin enfrentamiento documentado');
  }
});

test('a bonus objective does not gate victory', async ({ page }) => {
  await page.goto('/?mission=m2_chavin&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const m = g.mission;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const anchor = g.siteAnchor as { x: number; z: number } | null;
    const unit = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead) as any;
    if (!anchor || !unit) return { setup: false };
    unit.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    for (let i = 0; i < 5; i++) g.makeOffering('chavin_edificio_b');
    g.update(1 / 60, 0);
    g.spawnScriptedBuilding('market', 0, anchor.x, anchor.z + 34);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(500 / dt) && !m.ended; i++) {
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
      unit.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
      g.update(dt, t);
      t += dt;
    }
    return {
      setup: true,
      won: m.won as boolean | null,
      required: m.getObjectiveState('obj_ofrendas') as string,
      bonus: m.getObjectiveState('bonus_ofrenda_mayor') as string,
    };
  });
  expect(out.setup).toBe(true);
  expect(out.required).toBe('completed');
  expect(out.bonus).not.toBe('completed');
  expect(out.won).toBe(true);
});
