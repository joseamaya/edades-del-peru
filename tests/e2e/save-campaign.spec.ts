import { test, expect } from '@playwright/test';

async function startMission(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  await start.waitFor({ state: 'visible', timeout: 15_000 });
  await start.click();
  await start.waitFor({ state: 'detached', timeout: 15_000 });
}

const capture = () => {
  const g = (window as unknown as { game: any }).game;
  g.loop.stop();
  const objs: Record<string, string> = {};
  for (const o of g.mission.def.objectives) objs[o.id] = g.mission.getObjectiveState(o.id);
  return { units: g.units.size, buildings: g.buildings.size, objs };
};

test('saves and loads a campaign mission', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 15_000 },
  );

  const before = await page.evaluate(capture);
  await page.evaluate(() => (window as unknown as { game: any }).game.saveMatch());

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0 && g.buildings.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(capture);

  expect(after.units).toBe(before.units);
  expect(after.buildings).toBe(before.buildings);
  expect(after.objs).toEqual(before.objs);
  // the briefing must not reappear on load (the mission is already running)
  await expect(page.getByRole('button', { name: /COMENZAR MISIÓN/ })).toHaveCount(0);

  // continuing must not reload the snapshot (`?load=1`) instead of the next mission
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.settings.missionId = 'm2_chavin';
    g.resetGame();
  });
  await page.waitForURL(/mission=m2_chavin/, { timeout: 30_000 });
  expect(new URL(page.url()).searchParams.has('load')).toBe(false);
});

test('saves and loads the Chavín offerings and site phase', async ({ page }) => {
  await page.goto('/?mission=m2_chavin&seed=900&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const anchor = g.siteAnchor as { x: number; z: number };
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    let t = 0;
    const tick = (seconds: number) => {
      const dt = 1 / 60;
      for (let i = 0; i < Math.ceil(seconds / dt) && !m.ended; i++) {
        document.querySelector('.ed-mission-card')?.remove();
        worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
        g.update(dt, t);
        t += dt;
      }
    };
    tick(5);
    g.makeOffering('chavin_edificio_b');
    g.makeOffering('chavin_edificio_b');
    tick(2);
    for (let i = 0; i < 3; i++) m.recordDelivery('stone', 50);
    tick(2);
    g.saveMatch();
    return {
      phase: g.sitePhase as string,
      offering: m.getObjectiveProgress('a1_ofrenda'),
      oldTemple: m.getObjectiveState('a2_templo') as string,
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
      silver: g.players[0].resources.silver,
    };
  });
  expect(before.phase).toBe('old_temple');
  expect(before.offering?.current).toBe(100);
  expect(before.oldTemple).toBe('completed');
  expect(before.tutorialStep).not.toBeNull();

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      phase: g.sitePhase as string,
      offering: g.mission.getObjectiveProgress('a1_ofrenda'),
      oldTemple: g.mission.getObjectiveState('a2_templo') as string,
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
      silver: g.players[0].resources.silver,
    };
  });
  expect(after.phase).toBe(before.phase);
  expect(after.offering).toEqual(before.offering);
  expect(after.oldTemple).toBe(before.oldTemple);
  expect(after.tutorialStep).toBe(before.tutorialStep);
  expect(after.silver).toBe(before.silver);
});

test('saves and loads the Moche canal, hold and exchange', async ({ page }) => {
  await page.goto('/?mission=m3_moche_recuay&seed=400&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const anchor = g.siteAnchor as { x: number; z: number };
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    g.toggleCanal();
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(92 / dt) && !g.mission.ended; i++) {
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
      worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
      g.update(dt, t);
      t += dt;
    }
    document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    for (let i = 0; i < 2; i++) g.makeTrade('moche_huaca_luna');
    g.saveMatch();
    return {
      canal: g.isCanalOpen(),
      hold: g.mission.getObjectiveProgress('obj_huacas'),
      trade: g.mission.getObjectiveProgress('obj_intercambio'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
      silver: g.players[0].resources.silver,
    };
  });
  expect(before.canal).toBe(true);
  expect(before.hold?.current).toBe(90);
  expect(before.trade?.current).toBe(100);
  expect(before.tutorialStep).not.toBeNull();

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      canal: g.isCanalOpen(),
      hold: g.mission.getObjectiveProgress('obj_huacas'),
      trade: g.mission.getObjectiveProgress('obj_intercambio'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
      silver: g.players[0].resources.silver,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads the Wari network and frontier', async ({ page }) => {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const center = g.playerCenter(0);
    g.spawnScriptedBuilding('farm', 0, center.x + 8, center.z + 8);
    g.spawnScriptedBuilding('farm', 0, center.x - 8, center.z + 8);
    g.players[0].resources.food = 600;
    const site = g.siteCenter as { x: number; z: number };
    const network = g.mission.def.objectives.find((o: any) => o.id === 'obj_red');
    const nodes = network.nodes.map((n: any) => ({ x: site.x + n.dx, z: site.z + n.dz }));
    for (const node of nodes) g.spawnScriptedBuilding('market', 0, node.x, node.z);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(10 / dt); i++) {
      const unit = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead) as any;
      if (unit) unit.pos.set(nodes[0].x, g.terrain.getHeight(nodes[0].x, nodes[0].z), nodes[0].z);
      g.update(dt, t);
      t += dt;
    }
    g.saveMatch();
    return {
      network: g.mission.getObjectiveProgress('obj_red'),
      frontier: g.mission.getObjectiveProgress('obj_frontera'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
      roads: g.settlements.filter((s: any) => s.group?.name?.startsWith('mission-roads')).length,
    };
  });
  expect(before.network?.current).toBe(2);
  expect(before.frontier?.current).toBeGreaterThan(0);
  expect(before.tutorialStep).not.toBeNull();

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      network: g.mission.getObjectiveProgress('obj_red'),
      frontier: g.mission.getObjectiveProgress('obj_frontera'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
      roads: g.settlements.filter((s: any) => s.group?.name?.startsWith('mission-roads')).length,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads m9 during the bombardment', async ({ page }) => {
  await page.goto('/?mission=m9_guerra_pacifico&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const dt = 1 / 60;
    let t = 0;
    const step = () => {
      g.update(dt, t);
      t += dt;
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    };
    // Act I -> Act II: the bombardment hold and Bolognesi's guard become active.
    m.objState.set('a1_parlamento', 'completed');
    step();
    m.objState.set('a1_minas', 'completed');
    step();
    for (let i = 0; i < Math.ceil(8 / dt) && !m.ended; i++) step();
    g.saveMatch();
    return {
      state: m.getObjectiveState('a2_bombardeo'),
      bolognesi: m.getObjectiveState('a2_bolognesi'),
      hold: m.getObjectiveProgress('a2_bombardeo'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.state).toBe('activo');
  expect(before.bolognesi).toBe('activo');
  expect(before.hold?.current ?? 0).toBeGreaterThan(0);

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      state: g.mission.getObjectiveState('a2_bombardeo'),
      bolognesi: g.mission.getObjectiveState('a2_bolognesi'),
      hold: g.mission.getObjectiveProgress('a2_bombardeo'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads m7 during the Sangarará hold', async ({ page }) => {
  await page.goto('/?mission=m7_tupac_amaru&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const dt = 1 / 60;
    let t = 0;
    const step = () => {
      g.update(dt, t);
      t += dt;
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    };
    // Act I -> Tungasuca -> Sangarará: the hold and its waves become active.
    m.objState.set('a1_cuartel', 'completed');
    m.objState.set('a1_avituallamiento', 'completed');
    step();
    m.objState.set('a1_tungasuca', 'completed');
    step();
    m.objState.set('a2_sangarara', 'completed');
    step();
    const anchor = m.getObjectiveAnchor('a2_batalla') as { x: number; z: number };
    for (const u of [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead && u.kind !== 'worker')) {
      u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    }
    for (let i = 0; i < Math.ceil(5 / dt) && !m.ended; i++) step();
    g.saveMatch();
    return {
      sangarara: m.getObjectiveState('a2_sangarara'),
      batalla: m.getObjectiveState('a2_batalla'),
      hold: m.getObjectiveProgress('a2_batalla'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.sangarara).toBe('completed');
  expect(before.batalla).toBe('activo');
  expect(before.hold?.current ?? 0).toBeGreaterThan(0);

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      sangarara: g.mission.getObjectiveState('a2_sangarara'),
      batalla: g.mission.getObjectiveState('a2_batalla'),
      hold: g.mission.getObjectiveProgress('a2_batalla'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads Tambotoco mid Act IV (Inticancha phase)', async ({ page }) => {
  await page.goto('/?mission=m_tambotoco&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.setSitePhase('inticancha');
    if (g.sitePhase !== 'inticancha') return { phase: g.sitePhase };
    const m = g.mission;
    for (const id of [
      'a1_salida',
      'a1_campamento',
      'a1_caza',
      'a1_manco',
      'a2_huanacaure',
      'a3_acequia',
      'a3_hualla',
      'a4_inticancha',
    ]) {
      m.objState.set(id, 'completed');
    }
    m.objState.set('a4_canchas', 'activo');
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(2 / dt) && !g.mission.ended; i++) {
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      g.update(dt, t);
      t += dt;
    }
    g.saveMatch();
    return {
      phase: g.sitePhase,
      timer: g.mission.timer,
      heritage: g.getVisitedHeritage(),
      canchas: g.mission.getObjectiveProgress('a4_canchas'),
      objectives: Object.fromEntries(
        g.mission.def.objectives.map((o: any) => [o.id, g.mission.getObjectiveState(o.id)]),
      ),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.phase).toBe('inticancha');
  expect(before.tutorialStep).not.toBeNull();
  expect(before.objectives.a4_inticancha).toBe('completed');
  expect(before.objectives.a4_canchas).toBe('activo');
  expect(before.canchas?.current).toBe(0);

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      phase: g.sitePhase,
      timer: g.mission.timer,
      heritage: g.getVisitedHeritage(),
      canchas: g.mission.getObjectiveProgress('a4_canchas'),
      objectives: Object.fromEntries(
        g.mission.def.objectives.map((o: any) => [o.id, g.mission.getObjectiveState(o.id)]),
      ),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads Lima during the ciudad siege', async ({ page }) => {
  await page.goto('/?mission=m_lima&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.setSitePhase('ciudad');
    if (g.sitePhase !== 'ciudad') return { phase: g.sitePhase, setup: false };
    const m = g.mission;
    m.objState.set('a1_traza', 'completed');
    m.objState.set('a1_cabildo', 'completed');
    m.objState.set('a2_cerco', 'activo');
    const anchor = m.getObjectiveAnchor('a2_cerco') as { x: number; z: number };
    for (const u of [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead && u.kind !== 'worker')) {
      u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    }
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(5 / dt) && !g.mission.ended; i++) {
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      g.update(dt, t);
      t += dt;
    }
    g.saveMatch();
    return {
      phase: g.sitePhase,
      timer: g.mission.timer,
      cerco: g.mission.getObjectiveProgress('a2_cerco'),
      objectives: Object.fromEntries(
        g.mission.def.objectives.map((o: any) => [o.id, g.mission.getObjectiveState(o.id)]),
      ),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.phase).toBe('ciudad');
  expect(before.tutorialStep).not.toBeNull();
  expect(before.objectives.a2_cerco).toBe('activo');
  expect(before.cerco?.current ?? 0).toBeGreaterThan(0);

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      phase: g.sitePhase,
      timer: g.mission.timer,
      cerco: g.mission.getObjectiveProgress('a2_cerco'),
      objectives: Object.fromEntries(
        g.mission.def.objectives.map((o: any) => [o.id, g.mission.getObjectiveState(o.id)]),
      ),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads La Junta during the Apacheta hold', async ({ page }) => {
  await page.goto('/?mission=m_junta_cusco&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const dt = 1 / 60;
    let t = 0;
    const step = () => {
      g.update(dt, t);
      t += dt;
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    };
    // Act I -> Act II: the Apacheta hold and its wave become active.
    m.objState.set('a1_cabildo', 'completed');
    step();
    m.objState.set('a1_cuartel', 'completed');
    step();
    m.objState.set('a2_apacheta', 'completed');
    step();
    const anchor = m.getObjectiveAnchor('a2_batalla') as { x: number; z: number };
    for (const u of [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead && u.kind !== 'worker')) {
      u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    }
    for (let i = 0; i < Math.ceil(5 / dt) && !m.ended; i++) step();
    g.saveMatch();
    return {
      apacheta: m.getObjectiveState('a2_batalla'),
      hold: m.getObjectiveProgress('a2_batalla'),
      pumacahua: m.getObjectiveState('a3_pumacahua'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.apacheta).toBe('activo');
  expect(before.hold?.current ?? 0).toBeGreaterThan(0);

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      apacheta: g.mission.getObjectiveState('a2_batalla'),
      hold: g.mission.getObjectiveProgress('a2_batalla'),
      pumacahua: g.mission.getObjectiveState('a3_pumacahua'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads La Junta during the Umachiri resistance', async ({ page }) => {
  await page.goto('/?mission=m_junta_cusco&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const dt = 1 / 60;
    let t = 0;
    const step = () => {
      g.update(dt, t);
      t += dt;
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    };
    // Act III: Umachiri reaches the plain and the resistance hold becomes active.
    for (const id of ['a1_cabildo', 'a1_cuartel', 'a2_apacheta', 'a2_batalla', 'a3_umachiri']) {
      m.objState.set(id, 'completed');
    }
    step();
    const anchor = m.getObjectiveAnchor('a3_resistir') as { x: number; z: number };
    for (const u of [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead && u.kind !== 'worker')) {
      u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    }
    for (let i = 0; i < Math.ceil(5 / dt) && !m.ended; i++) step();
    g.saveMatch();
    return {
      resistir: m.getObjectiveProgress('a3_resistir'),
      timer: m.timer,
      pumacahua: m.getObjectiveState('a3_pumacahua'),
      objectives: Object.fromEntries(m.def.objectives.map((o: any) => [o.id, m.getObjectiveState(o.id)])),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.objectives.a3_resistir).toBe('activo');
  expect(before.resistir?.current ?? 0).toBeGreaterThan(0);

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      resistir: g.mission.getObjectiveProgress('a3_resistir'),
      timer: g.mission.timer,
      pumacahua: g.mission.getObjectiveState('a3_pumacahua'),
      objectives: Object.fromEntries(
        g.mission.def.objectives.map((o: any) => [o.id, g.mission.getObjectiveState(o.id)]),
      ),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads m5 mid-siege', async ({ page }) => {
  await page.goto('/?mission=m5_yahuar_pampa&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(120 / dt) && !g.mission.ended; i++) {
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      g.update(dt, t);
      t += dt;
    }
    g.saveMatch();
    return {
      defend: g.mission.getObjectiveProgress('obj_defend'),
      counterattack: g.mission.getObjectiveState('obj_kill'),
      cusi: g.mission.getObjectiveState('obj_cusi'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.defend?.current ?? 0).toBeGreaterThan(60);
  expect(before.counterattack).toBe('pendiente');

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      defend: g.mission.getObjectiveProgress('obj_defend'),
      counterattack: g.mission.getObjectiveState('obj_kill'),
      cusi: g.mission.getObjectiveState('obj_cusi'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads the later campaign missions', async ({ context }) => {
  test.setTimeout(180_000);
  for (const id of [
    'm4_wari',
    'm_tambotoco',
    'm5_yahuar_pampa',
    'm6_chimu_inca',
    'm6b_guerra_civil',
    'm7_tupac_amaru',
    'm_lima',
    'm_junta_cusco',
    'm8_independencia',
    'm9_guerra_pacifico',
  ]) {
    const page = await context.newPage();
    // Save/load is under test, not the narrated intros (Tambotoco's runs ~29 s, past the 15 s wait).
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1&intro=0`);
    await startMission(page);
    await page.waitForFunction(
      () => {
        const g = (window as unknown as { game?: any }).game;
        return !!g?.mission && g.units.size > 0;
      },
      null,
      { timeout: 20_000 },
    );
    const before = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      if (g.getPaused()) g.togglePause();
      const dt = 1 / 60;
      for (let i = 0; i < Math.ceil(15 / dt); i++) g.update(dt, i * dt);
      const objs: Record<string, string> = {};
      const progress: Record<string, unknown> = {};
      for (const o of g.mission.def.objectives) {
        objs[o.id] = g.mission.getObjectiveState(o.id);
        progress[o.id] = g.mission.getObjectiveProgress(o.id);
      }
      g.saveMatch();
      return {
        missionId: g.settings.missionId,
        units: g.units.size,
        buildings: g.buildings.size,
        objs,
        progress,
        tutorialStep: g.tutorial?.toSave().stepId ?? null,
        resources: { ...g.players[0].resources },
      };
    });

    await page.goto('/?load=1&noloop=1');
    await page.waitForFunction(
      () => {
        const g = (window as unknown as { game?: any }).game;
        return !!g?.mission && g.units.size > 0;
      },
      null,
      { timeout: 20_000 },
    );
    const after = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      const objs: Record<string, string> = {};
      const progress: Record<string, unknown> = {};
      for (const o of g.mission.def.objectives) {
        objs[o.id] = g.mission.getObjectiveState(o.id);
        progress[o.id] = g.mission.getObjectiveProgress(o.id);
      }
      return {
        missionId: g.settings.missionId,
        units: g.units.size,
        buildings: g.buildings.size,
        objs,
        progress,
        tutorialStep: g.tutorial?.toSave().stepId ?? null,
        resources: { ...g.players[0].resources },
      };
    });

    expect(after, `${id} save round-trip`).toEqual(before);
    await expect(page.getByRole('button', { name: /COMENZAR MISIÓN/ })).toHaveCount(0);
    await page.close();
  }
});
