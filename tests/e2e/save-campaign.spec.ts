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
      // Completing the network opens the Act III card; it pauses the clock until dismissed.
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
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
    // The hold counts a crew on the cuartel line, not the garrison's start south of the base: post three
    // soldiers there so the saved state carries real progress.
    const line = m.getObjectiveAnchor('a2_bombardeo') as { x: number; z: number };
    const minUnits = m.def.objectives.find((o: any) => o.id === 'a2_bombardeo')?.minUnits ?? 3;
    const crew: any[] = [];
    for (const u of g.units.values()) {
      if (u.owner !== 0 || u.dead || u.kind === 'worker' || crew.length >= minUnits + 2) continue;
      crew.push(u);
    }
    // Keep the crew pinned for the fixture: a teleport alone walks back to the spawn, and one stray step
    // out of the radius resets the hold. Two spare over `minUnits` cover the count.
    for (let i = 0; i < Math.ceil(6 / dt) && !m.ended; i++) {
      for (const u of crew) {
        u.orderQueue.length = 0;
        u.pos.set(line.x, g.terrain.getHeight(line.x, line.z), line.z);
      }
      step();
    }
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
      'a3_oleada',
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
    const heroes = [...g.units.values()]
      .filter((u: any) => u.tag)
      .map((u: any) => ({ tag: u.tag, gender: u.gender, variant: u.unitView?.rig?.variantId ?? null }))
      .sort((a: any, b: any) => a.tag.localeCompare(b.tag));
    g.saveMatch();
    return {
      phase: g.sitePhase,
      timer: g.mission.timer,
      heroes,
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
    const heroes = [...g.units.values()]
      .filter((u: any) => u.tag)
      .map((u: any) => ({ tag: u.tag, gender: u.gender, variant: u.unitView?.rig?.variantId ?? null }))
      .sort((a: any, b: any) => a.tag.localeCompare(b.tag));
    return {
      phase: g.sitePhase,
      timer: g.mission.timer,
      heroes,
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

test('saves and loads m6 mid-surrender', async ({ page }) => {
  await page.goto('/?mission=m6_chimu_inca&seed=777&fog=0&low=1&intro=0');
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
    const tupac = [...g.units.values()].find((u: any) => u.tag === 'tupac_yupanqui') as any;
    const advance = m.getObjectiveAnchor('obj_avanzar') as { x: number; z: number };
    tupac.pos.set(advance.x, g.terrain.getHeight(advance.x, advance.z), advance.z);
    g.update(1 / 60, 0);
    document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    const canal = g.canalSite as { x: number; z: number };
    tupac.pos.set(canal.x, g.terrain.getHeight(canal.x, canal.z), canal.z);
    g.update(1 / 60, 0.01);
    g.toggleCanal();
    g.update(1 / 60, 0.02);
    document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    const anchor = g.siteAnchor as { x: number; z: number };
    const army = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead).slice(0, 8) as any[];
    for (const u of army) u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    const dt = 1 / 60;
    let t = 0.1;
    for (let i = 0; i < Math.ceil(10 / dt) && !m.ended; i++) {
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      for (const u of army) u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
      g.update(dt, t);
      t += dt;
    }
    g.saveMatch();
    return {
      surrender: g.mission.getObjectiveProgress('obj_rendicion'),
      canal: m.getObjectiveState('obj_canal'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.surrender?.current ?? 0).toBeGreaterThan(5);
  expect(before.canal).toBe('completed');

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
      surrender: g.mission.getObjectiveProgress('obj_rendicion'),
      canal: g.mission.getObjectiveState('obj_canal'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads m6b mid-capture', async ({ page }) => {
  await page.goto('/?mission=m6b_guerra_civil&seed=777&fog=0&low=1&intro=0');
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
    const step = () => {
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      g.update(1 / 60, 0);
    };
    m.objState.set('obj_avanzar', 'completed');
    step();
    m.objState.set('obj_quipaipan', 'completed');
    step();
    const anchor = m.getObjectiveAnchor('obj_captura') as { x: number; z: number };
    const army = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead).slice(0, 8) as any[];
    for (const u of army) u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    const dt = 1 / 60;
    let t = 0.1;
    // Stop as soon as the capture clock passes the threshold; the enemy can still defeat the camp
    // if the test keeps simulating after the save point.
    for (let i = 0; i < Math.ceil(6 / dt) && !m.ended; i++) {
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      for (const u of army) u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
      g.update(dt, t);
      t += dt;
      if ((m.getObjectiveProgress('obj_captura')?.current ?? 0) > 2) break;
    }
    g.saveMatch();
    return {
      capture: g.mission.getObjectiveProgress('obj_captura'),
      hold: m.getObjectiveState('obj_quipaipan'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.capture?.current ?? 0).toBeGreaterThan(2);
  expect(before.hold).toBe('completed');

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 45_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      capture: g.mission.getObjectiveProgress('obj_captura'),
      hold: g.mission.getObjectiveState('obj_quipaipan'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads m8 mid-Ayacucho', async ({ page }) => {
  await page.goto('/?mission=m8_independencia&seed=777&fog=0&low=1&intro=0');
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
    m.objState.set('obj_junin', 'completed');
    m.objState.set('obj_marcha', 'completed');
    m.objState.set('obj_ayacucho', 'activo');
    const anchor = m.getObjectiveAnchor('obj_ayacucho') as { x: number; z: number };
    const army = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead).slice(0, 8) as any[];
    for (const u of army) u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    const dt = 1 / 60;
    let t = 0.1;
    for (let i = 0; i < Math.ceil(5 / dt) && !m.ended; i++) {
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      for (const u of army) u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
      g.update(dt, t);
      t += dt;
    }
    g.saveMatch();
    return {
      ayacucho: g.mission.getObjectiveProgress('obj_ayacucho'),
      junin: m.getObjectiveState('obj_junin'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(before.ayacucho?.current ?? 0).toBeGreaterThan(2);
  expect(before.junin).toBe('completed');

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
      ayacucho: g.mission.getObjectiveProgress('obj_ayacucho'),
      junin: g.mission.getObjectiveState('obj_junin'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
    };
  });
  expect(after).toEqual(before);
});

test('saves and loads the Real Felipe siege', async ({ page }) => {
  await page.goto('/?mission=m_real_felipe&seed=777&fog=0&low=1&intro=0');
  await startMission(page);
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    // Open the sortie act through its prerequisites; the triggers fire on the next updates.
    m.objState.set('a1_baterias', 'completed');
    m.objState.set('a2_bloqueo', 'completed');
    for (let i = 0; i < 180; i++) g.update(1 / 60, i / 60);
    document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    g.saveMatch();
    return {
      food: g.players[0].resources.food,
      salidas: m.getObjectiveState('a3_salidas'),
      hold: m.getObjectiveProgress('a3_salidas'),
      royalists: [...g.units.values()].filter((u: any) => u.owner === 1 && !u.dead).length,
    };
  });
  expect(before.salidas).toBe('activo');

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
    const m = g.mission;
    return {
      food: g.players[0].resources.food,
      salidas: m.getObjectiveState('a3_salidas'),
      hold: m.getObjectiveProgress('a3_salidas'),
      royalists: [...g.units.values()].filter((u: any) => u.owner === 1 && !u.dead).length,
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
    'm_cusco_1536',
    'm_vilcabamba',
    'm_junta_cusco',
    'm_lima_1821',
    'm8_independencia',
    'm_real_felipe',
    'm9_guerra_pacifico',
    'm_tarapaca',
    'm_miraflores',
    'm_brena',
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
