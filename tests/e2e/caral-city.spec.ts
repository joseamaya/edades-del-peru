import { expect, test } from '@playwright/test';
import { OPENING_BASE_CLEARANCE } from '../../src/core/Config';
import { CARAL_CIRCULAR_ALTAR, CARAL_SITE_BLOCKERS } from '../../src/model/defs/sites';
import { CARAL_CITY_BLOCKERS } from '../../src/model/defs/caralCity';
import { CANAL_WATER_LIFT } from '../../src/rendering/canal';

const URL = '/?mission=m1_caral&seed=3000&fog=0&low=1&noloop=1&intro=0';

async function boot(page: import('@playwright/test').Page, requireModules = true) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  await page.waitForFunction(
    (expectModules: boolean) => {
      const g = (window as unknown as { game?: any }).game;
      const landmark = g?.landmark;
      if (g?.setpiece === undefined || landmark === undefined) return false;
      if (!expectModules) return true;
      return (
        landmark.getObjectByName('caral_pyramid_mayor') !== undefined &&
        landmark.getObjectByName('caral_anfiteatro') !== undefined &&
        ['central', 'quarry', 'lesser', 'gallery', 'huanca'].every(
          (name) => landmark.getObjectByName(`caral_pyramid_${name}`) !== undefined,
        )
      );
    },
    requireModules,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => (window as unknown as { game?: any }).game?.landmark?.getObjectByName('caral_site'),
    null,
    {
      timeout: 30_000,
    },
  );
  // Settle one frame: the HUD must have rendered the opening objectives and the
  // skinned worker must have its skeleton matrices before tests read either.
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const dismiss = () => document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    dismiss();
    if (g.getPaused()) g.togglePause();
    g.update(1 / 60, 0);
    dismiss();
    g.hud.update(0.2, 0);
    g.runtime.render();
  });
  return errors;
}

test('the Caral scenario loads the authored sacred-city site', { tag: '@smoke' }, async ({ page }) => {
  const errors = await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const site = g.missionLayout.site;
    const model = g.landmark.getObjectByName('caral_site');
    let verts = 0;
    let meshes = 0;
    model?.traverse((o: any) => {
      if (o.isMesh && o.geometry?.attributes?.position) {
        verts += o.geometry.attributes.position.count;
        meshes++;
      }
    });
    const inRect = (n: any, r: any) => Math.abs(n.pos.x - r.x) <= r.rx && Math.abs(n.pos.z - r.z) <= r.rz;
    const resources = g.missionLayout.site.keepout.map(
      (r: any) => [...g.resourceNodes.values()].filter((n: any) => inRect(n, r)).length,
    );
    const base = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    const names = [
      'caral_pyramid_mayor',
      'caral_pyramid_central',
      'caral_pyramid_quarry',
      'caral_pyramid_lesser',
      'caral_pyramid_gallery',
      'caral_pyramid_huanca',
      'caral_anfiteatro',
    ];
    return {
      siteId: site?.id ?? null,
      focusX: site?.focus?.x ?? null,
      focusZ: site?.focus?.z ?? null,
      meshes,
      verts,
      landmarkX: g.landmark?.position.x ?? null,
      landmarkZ: g.landmark?.position.z ?? null,
      anchorX: g.siteAnchor?.x ?? null,
      anchorZ: g.siteAnchor?.z ?? null,
      modelName: model?.name ?? null,
      modelScale: model?.scale.x ?? null,
      hiddenSourceLayers: (() => {
        let visible = 0;
        g.landmark.traverse((o: any) => {
          if (!/Infra_(Terrain|Reference)/.test(o.name)) return;
          let p = o;
          while (p) {
            if (!p.visible) return;
            p = p.parent;
          }
          visible++;
        });
        return visible;
      })(),
      hasSetpiece: !!g.setpiece,
      heritage: names.map((name) => [name, !!g.landmark?.getObjectByName(name)]),
      heritageIds: names.map((name) => [name, g.landmark?.getObjectByName(name)?.userData?.heritageId ?? null]),
      resources,
      base: base ? { x: base.pos.x, z: base.pos.z } : null,
      // Act I starts at Áspero, on the shore west of the valley.
      baseNearSea: base ? g.terrain.isWater(base.pos.x - 30, base.pos.z) : null,
      baseWest: base ? base.pos.x : null,
      riverWest: g.terrain.isWater(4, 90),
      cityDry: !g.terrain.isWater(164, 90),
      upperDry: !g.terrain.isWater(164, 30),
      lowerDry: !g.terrain.isWater(164, 152),
    };
  });
  expect(state.siteId).toBe('caral_site');
  expect(state.focusX).toBeCloseTo(163.84 / 256, 3);
  expect(state.focusZ).toBeCloseTo(53.184 / 256, 3);
  expect(state.modelName).toBe('caral_site');
  expect(state.modelScale).toBeCloseTo(0.25, 3);
  expect(state.hiddenSourceLayers).toBe(0);
  expect(state.meshes).toBeGreaterThan(3);
  expect(state.verts).toBeGreaterThan(5000);
  expect(state.hasSetpiece).toBe(false);
  for (const [name, present] of state.heritage) expect(present, name).toBe(true);
  for (const [name, id] of state.heritageIds) expect(id, name).toBe(name);
  for (const count of state.resources) expect(count).toBe(0);
  expect(state.base).not.toBeNull();
  expect(state.baseNearSea).toBe(true);
  expect(state.baseWest).toBeLessThan(50);
  expect(state.riverWest).toBe(true);
  expect(state.cityDry).toBe(true);
  expect(state.upperDry).toBe(true);
  expect(state.lowerDry).toBe(true);
  expect(state.landmarkX).toBe(0);
  expect(state.landmarkZ).toBe(0);
  expect(state.anchorX).toBe(164);
  expect(state.anchorZ).toBe(30);
  expect(errors).toEqual([]);
});

test('the Caral city in use replaces the ruins and follows the Pyramid Mayor phase', async ({ page }) => {
  const errors = await boot(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game: any }).game;
      return !!g.landmark?.getObjectByName('caral_city') && !!g.landmark?.getObjectByName('caral_site');
    },
    null,
    { timeout: 60_000 },
  );
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const city = g.caralCity;
    const lod = (n: number) => g.landmark.getObjectByName(`caral_city_lod${n}`);
    const tris = () => {
      let n = 0;
      lod(0).traverse((o: any) => {
        if (o.isMesh) n += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      });
      return n;
    };
    // m1 opens with the Pyramid Mayor's earliest platform; act III builds the later phases.
    const opening = city.mayorPhase;
    const foundation = tris();
    g.setSitePhase('in_use');
    const inUse = tris();
    const phase = city.mayorPhase;
    g.setSitePhase('foundation');
    return {
      ruinsVisible: g.landmark.getObjectByName('caral_site').visible,
      lod0Meshes: lod(0).children.length,
      lod1Meshes: lod(1).children.length,
      opening,
      phase,
      inUse,
      foundation,
      back: tris(),
    };
  });
  expect(state.ruinsVisible).toBe(false);
  expect(state.lod0Meshes).toBeGreaterThan(0);
  expect(state.lod0Meshes).toBeLessThanOrEqual(8);
  expect(state.lod1Meshes).toBeLessThanOrEqual(8);
  expect(state.opening).toBe('foundation');
  expect(state.phase).toBe('in_use');
  expect(state.foundation).not.toBe(state.inUse);
  expect(state.back).toBe(state.foundation);
  expect(errors).toEqual([]);
});

test('the authored site blocks monument footprints without sealing the city', async ({ page }) => {
  const errors = await boot(page);
  const state = await page.evaluate((house) => {
    const g = (window as unknown as { game: any }).game;
    // The finished city: every monument stands.
    g.setSitePhase('in_use');
    return {
      mayor: g.pathfinder.isWalkable(164, 30),
      anfiteatro: g.pathfinder.isWalkable(164, 152),
      plaza: g.pathfinder.isWalkable(164, 53),
      base: g.pathfinder.isWalkable(34, 172),
      // From Áspero across a ford of the Supe to the city.
      route: g.pathfinder.pathfind(34, 172, 164, 53).length,
      buildOnMayor: g.canPlace(164, 30, 4),
      buildInValley: g.canPlace(48, 110, 4),
      buildInGap: g.canPlace(166, 136.5, 4),
      // The city in use: a quincha house of the architecture kit blocks its footprint.
      residentialWall: g.pathfinder.isWalkable(house.x, house.z),
      openValley: g.pathfinder.isWalkable(48, 120),
      baseBuildable: !!g.findFreeSpot(46, 165, 4),
      commandBlocked: (() => {
        const before = g.buildings.size;
        const ok = g.executeCommand({ kind: 'place', building: 'house', x: 164, z: 30 });
        return { ok, before, after: g.buildings.size };
      })(),
    };
  }, CARAL_CITY_BLOCKERS[0]);
  expect(state.mayor).toBe(false);
  expect(state.anfiteatro).toBe(false);
  expect(state.plaza).toBe(true);
  expect(state.base).toBe(true);
  expect(state.route).toBeGreaterThan(0);
  expect(state.buildOnMayor).toBe(false);
  expect(state.buildInValley).toBe(true);
  expect(state.buildInGap).toBe(false);
  expect(state.residentialWall).toBe(false);
  expect(state.openValley).toBe(true);
  expect(state.baseBuildable).toBe(true);
  expect(state.commandBlocked.ok).toBe(false);
  expect(state.commandBlocked.after).toBe(state.commandBlocked.before);
  expect(errors).toEqual([]);
});

test('the Caral objectives reveal in acts and keep the assembly hidden until the city', async ({ page }) => {
  await boot(page);
  const objectives = page.locator('#ed-objectives');
  const advance = (complete: string) =>
    page.evaluate((id: string) => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      g.mission.objState.set(id, 'completed');
      g.mission.update(0.1, 0);
      document.querySelector<HTMLElement>('.ed-mission-card')?.click();
      g.mission.update(0.1, 0);
      g.hud.update(0.2, 0);
    }, complete);
  await expect(objectives).toContainText('Acto I · Reúne 300 de comida');
  await expect(objectives).not.toContainText('Acto II');
  await expect(objectives).not.toContainText('depósito comunal');
  await expect(objectives).not.toContainText('0/6');
  const plaza = page.locator('#ed-bottom');
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectedHeritage = 'caral_pyramid_mayor';
    g.hud.update(0.2, 0);
  });
  await expect(plaza).not.toContainText('Convocar asamblea');
  await expect(plaza).not.toContainText('Entregar materiales');

  await advance('a1_pesca');
  await expect(objectives).toContainText('Remonta el río Supe');
  await advance('a1_valle');
  await expect(page.locator('.ed-mission-card')).toHaveCount(0);
  await expect(objectives).toContainText('Acto II · Prepara dos campos');
  await advance('a2_campos');
  await expect(objectives).toContainText('Abre la compuerta del canal comunal');
  await advance('a2_canal');
  await expect(objectives).toContainText('depósito comunal');
  await advance('a2_troje');
  await expect(objectives).toContainText('Teje redes de algodón');
  await advance('a2_redes');
  await expect(objectives).toContainText('excedente de 500');
  await advance('a2_excedente');
  await expect(objectives).toContainText('Acto III · Entrega 150 de madera');
  await expect(objectives).toContainText('0/6');
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectedHeritage = 'caral_pyramid_mayor';
    g.hud.update(0.2, 0);
  });
  await expect(plaza).toContainText('Convocar asamblea');
  await expect(plaza).toContainText('Entregar materiales (50 madera) · 0/150');
});

test('an empty communal store pauses the pyramid work turn until the store is back and fed', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    // Complete the delivery objective; its trigger activates the first work turn.
    m.objState.set('a3_shicras', 'completed');
    m.update(0.1, 0);
    // The crew is fed from the communal store, so it must stand before the turn can advance.
    const c = g.playerCenter(0);
    g.spawnScriptedBuilding('mill', 0, c.x + 6, c.z);
    const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    worker.pos.set(site.x, g.terrain.getHeight(site.x, site.z), site.z);
    g.players[0].resources.food = 0;
    let t = 0;
    for (let i = 0; i < 21; i++) {
      g.update(1, t);
      t += 1;
    }
    const paused = m.getObjectiveProgress('a3_obra_relleno')?.current ?? -1;
    const phaseWhilePaused = g.sitePhase;
    g.players[0].resources.food = 100;
    for (let i = 0; i < 20; i++) {
      g.update(1, t);
      t += 1;
    }
    return {
      paused,
      phaseWhilePaused,
      state: m.getObjectiveState('a3_obra_relleno') as string,
      phase: g.sitePhase,
    };
  });
  expect(out.paused).toBe(0);
  expect(out.phaseWhilePaused).toBe('foundation');
  expect(out.state).toBe('completed');
  expect(out.phase).toBe('fill');
});

test('the Caral base uses compound architecture for its center and houses', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead);
    const house = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'house' && !b.dead);
    const roof = (b: any) => {
      const group = b.view.group.getObjectByName('caral_roof');
      const panels = group?.children ?? [];
      const patio = b.view.group.localToWorld(new window.THREE.Vector3(0, 5, 0));
      const ray = new window.THREE.Raycaster(patio, new window.THREE.Vector3(0, -1, 0));
      return { panels: panels.length, patioOpen: ray.intersectObject(group, true).length === 0 };
    };
    return {
      center: !!center?.view?.group?.getObjectByName('caral_center'),
      house: !!house?.view?.group?.getObjectByName('caral_house'),
      centerRoof: roof(center),
      houseRoof: roof(house),
    };
  });
  expect(state.center).toBe(true);
  expect(state.house).toBe(true);
  expect(state.centerRoof.panels).toBeGreaterThan(0);
  expect(state.houseRoof.panels).toBeGreaterThan(0);
  expect(state.centerRoof.patioOpen).toBe(true);
  expect(state.houseRoof.patioOpen).toBe(true);
});

test('the Caral dwellings read at unit scale and keep the central plaza dominant', async ({ page }) => {
  await boot(page);
  const heights = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead);
    const house = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'house' && !b.dead);
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.garrisonedIn);
    // Precise bounds: a consolidated worker mesh keeps its merged parts in the anchor's bind space, so
    // only the skinned vertex positions tell how tall the drawn worker is.
    const height = (obj: any) => {
      obj.updateWorldMatrix(true, true);
      return new window.THREE.Box3().setFromObject(obj, true).getSize(new window.THREE.Vector3()).y;
    };
    return {
      center: height(center.view.group.getObjectByName('caral_center')),
      house: height(house.view.group.getObjectByName('caral_house')),
      worker: height(worker.view.group),
    };
  });
  expect(heights.house).toBeGreaterThanOrEqual(1.5);
  expect(heights.house / heights.worker).toBeGreaterThanOrEqual(0.8);
  expect(heights.center).toBeGreaterThanOrEqual(2.0);
  expect(heights.center / heights.house).toBeGreaterThanOrEqual(1.2);
});

test('the Caral opening keeps the base clear of mines, wells, cacti and vicuñas', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate((clearance: number) => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead);
    const nodes = [...g.resourceNodes.values()].map((n: any) => ({
      kind: n.kind,
      d: Math.hypot(n.pos.x - center.pos.x, n.pos.z - center.pos.z),
    }));
    const nearProps: string[] = [];
    for (const [kind, mesh] of g.props.meshes ?? []) {
      for (let i = 0; i < mesh.count; i++) {
        const matrix = new window.THREE.Matrix4();
        mesh.getMatrixAt(i, matrix);
        const p = new window.THREE.Vector3().setFromMatrixPosition(matrix);
        if (Math.hypot(p.x - center.pos.x, p.z - center.pos.z) < clearance) nearProps.push(kind);
      }
    }
    const fauna = g.wildlife.debugSnapshot();
    return {
      near: nodes.filter((n: any) => n.d < clearance).map((n: any) => n.kind),
      nearProps,
      nearFauna: fauna
        .filter((a: any) => Math.hypot(a.x - center.pos.x, a.z - center.pos.z) < clearance)
        .map((a: any) => a.species),
      species: fauna.map((a: any) => a.species),
      mines: nodes.filter((n: any) => n.kind === 'mine').length,
      hunts: nodes.filter((n: any) => n.kind === 'hunt').length,
      quarries: nodes.filter((n: any) => n.kind === 'well').length,
      cacti: g.scene.getObjectByName('props_cactus')?.count ?? -1,
    };
  }, OPENING_BASE_CLEARANCE);
  expect(state.near).toEqual([]);
  expect(state.nearProps).toEqual([]);
  expect(state.nearFauna).toEqual([]);
  expect(state.species).not.toContain('llama');
  expect(state.species).not.toContain('vicuna');
  expect(state.mines).toBe(0);
  expect(state.hunts).toBe(0);
  expect(state.quarries).toBeGreaterThan(0);
  expect(state.cacti).toBe(0);
});

test('the authored site blocks every solid monument but keeps its plazas walkable', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(
    ([blockers, altar]) => {
      const g = (window as unknown as { game: any }).game;
      // Every monument stands once the city is in use.
      g.setSitePhase('in_use');
      const p = g.pathfinder;
      const inside = (x: number, z: number) =>
        blockers.find((b: any) => Math.abs(x - b.x) <= b.w / 2 && Math.abs(z - b.z) <= b.d / 2);
      const path = p.pathfind(139, 30, 189, 30);
      const aimed = p.pathfind(139, 30, 164, 30);
      const aimedEnd = aimed[aimed.length - 1];
      return {
        navCell: p.grid.cell,
        monuments: blockers.filter((b: any) => !p.isWalkable(b.x, b.z)).length,
        path: path.map((pt: any) => ({ x: pt.x, z: pt.z })),
        open: p.isWalkable(164, 100) && p.isWalkable(164, 53),
        altar: p.isWalkable(altar.x, altar.z),
        pathCrosses: path.filter((pt: any) => inside(pt.x, pt.z)).length,
        aimedInside: aimedEnd ? !!inside(aimedEnd.x, aimedEnd.z) : false,
      };
    },
    [CARAL_SITE_BLOCKERS, CARAL_CIRCULAR_ALTAR],
  );
  expect(state.navCell).toBe(1);
  expect(state.monuments).toBe(CARAL_SITE_BLOCKERS.length);
  expect(state.open).toBe(true);
  expect(state.altar).toBe(false);
  expect(state.path.length).toBeGreaterThan(0);
  expect(state.pathCrosses).toBe(0);
  expect(state.aimedInside).toBe(false);
});

test('monuments still to be built neither block units nor answer clicks', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const p = g.pathfinder;
    const read = () => ({
      central: p.isWalkable(131.5, 57.5),
      amphitheatre: p.isWalkable(164, 151.65),
      mayor: p.isWalkable(164, 30),
      huaca: p.isWalkable(40, 148),
      centralCard: g.heritageStanding('caral_pyramid_central'),
    });
    const opening = { phase: g.sitePhase, ...read() };
    g.setSitePhase('finished');
    const finished = read();
    g.setSitePhase('in_use');
    const inUse = read();
    return { opening, finished, inUse };
  });
  // Act I: only the Pyramid Mayor's first platform and Áspero stand.
  expect(state.opening.phase).toBe('foundation');
  expect(state.opening.central).toBe(true);
  expect(state.opening.amphitheatre).toBe(true);
  expect(state.opening.centralCard).toBe(false);
  expect(state.opening.mayor).toBe(false);
  expect(state.opening.huaca).toBe(false);
  expect(state.finished.central).toBe(false);
  expect(state.finished.centralCard).toBe(true);
  expect(state.finished.amphitheatre).toBe(true);
  expect(state.inUse.amphitheatre).toBe(false);
});

test('Áspero fishers cast a net and move on when a fishing ground runs out', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const base = g.playerCenter(0);
    const grounds = [...g.resourceNodes.values()]
      .filter((n: any) => n.kind === 'fishing')
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.pos.x - base.x, a.pos.z - base.z) - Math.hypot(b.pos.x - base.x, b.pos.z - base.z),
      ) as any[];
    const first = grounds[0];
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker') as any;
    g.executeCommand(
      { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: first.id }, clear: true },
      false,
    );
    let t = 0;
    let netSeen = false;
    for (let i = 0; i < 20 * 40; i++) {
      g.update(0.05, t);
      t += 0.05;
      g.scene.traverse((o: any) => {
        if (o.name === 'fishing_net' && o.visible) netSeen = true;
      });
    }
    const fishingFirst = worker.lastGather?.kind;
    first.amount = 0.5;
    for (let i = 0; i < 20 * 60; i++) {
      g.update(0.05, t);
      t += 0.05;
    }
    const order = worker.orderQueue.find((o: any) => o.kind === 'gather');
    return {
      fishingFirst,
      netSeen,
      grounds: grounds.length,
      retargeted: !!order && order.entityId !== first.id,
      targetKind: order ? g.resourceNodes.get(order.entityId)?.kind : null,
    };
  });
  expect(state.grounds).toBeGreaterThan(1);
  expect(state.fishingFirst).toBe('fishing');
  expect(state.netSeen).toBe(true);
  expect(state.retargeted).toBe(true);
  expect(state.targetKind).toBe('fishing');
});

test('a fisher ordered to a tree does not return to the sea when the tree is taken', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const base = g.playerCenter(0);
    const grounds = [...g.resourceNodes.values()]
      .filter((n: any) => n.kind === 'fishing' && !n.dead)
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.pos.x - base.x, a.pos.z - base.z) - Math.hypot(b.pos.x - base.x, b.pos.z - base.z),
      ) as any[];
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    if (!worker || grounds.length === 0) return { ok: false, reason: 'missing worker or fishing ground' };

    g.executeCommand(
      { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: grounds[0].id }, clear: true },
      false,
    );
    let t = 0;
    for (let i = 0; i < 20 * 60 && worker.lastGather?.kind !== 'fishing'; i++) {
      g.update(0.05, t);
      t += 0.05;
    }
    const fishingFirst = worker.lastGather?.kind;

    const tree = [...g.resourceNodes.values()]
      .filter((n: any) => n.kind === 'tree' && !n.dead && n.amount > 0)
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.pos.x - worker.pos.x, a.pos.z - worker.pos.z) -
          Math.hypot(b.pos.x - worker.pos.x, b.pos.z - worker.pos.z),
      )[0] as any;
    if (!tree) return { ok: false, reason: 'no tree' };
    g.executeCommand(
      { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: tree.id }, clear: true },
      false,
    );
    const lastGatherAfterOrder = worker.lastGather?.kind;
    // Another worker fells the tree before this fisher arrives.
    tree.amount = 0;
    for (let i = 0; i < 20 * 10; i++) {
      g.update(0.05, t);
      t += 0.05;
    }
    const order = worker.orderQueue.find((o: any) => o.kind === 'gather');
    const stillFishing = order ? g.resourceNodes.get(order.entityId)?.kind === 'fishing' : false;
    const lastGatherKind = worker.lastGather?.kind ?? null;

    const liveTree = [...g.resourceNodes.values()]
      .filter((n: any) => n.kind === 'tree' && !n.dead && n.amount > 0)
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.pos.x - worker.pos.x, a.pos.z - worker.pos.z) -
          Math.hypot(b.pos.x - worker.pos.x, b.pos.z - worker.pos.z),
      )[0] as any;
    if (!liveTree) return { ok: false, reason: 'no live tree' };
    g.executeCommand(
      { kind: 'order', unitIds: [worker.id], order: { kind: 'gather', entityId: liveTree.id }, clear: true },
      false,
    );
    // Travel time scales with the mission's unit speed; keep the same margin as the full-speed specs.
    const travelBudget = 40 / g.unitSpeedScale;
    for (let i = 0; i < 20 * travelBudget && worker.gatherCarry.wood <= 0; i++) {
      g.update(0.05, t);
      t += 0.05;
    }
    return {
      ok: true,
      fishingFirst,
      lastGatherAfterOrder,
      lastGatherKind,
      stillFishing,
      woodGathered: worker.gatherCarry.wood,
    };
  });
  expect(state.ok, state.reason ?? '').toBe(true);
  expect(state.fishingFirst).toBe('fishing');
  expect(state.lastGatherAfterOrder).toBe('tree');
  expect(state.lastGatherKind).not.toBe('fishing');
  expect(state.stillFishing, 'the fisher must not go back to the sea').toBe(false);
  expect(state.woodGathered, 'the fisher must chop the new tree').toBeGreaterThan(0);
});

test('the Caral tutorial hides the shortcut help while it is open', async ({ page }) => {
  await boot(page);
  await expect(page.locator('#ed-tutorial')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#ed-help')).toBeHidden();
});

test('the Caral HUD keeps the tutorial and objectives separate at both review sizes', async ({ page }) => {
  await boot(page);
  await expect(page.locator('#ed-tutorial')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => (window as unknown as { game: any }).game.loop.stop());
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1600, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const tutorial = await page.locator('#ed-tutorial').boundingBox();
    const objectives = await page.locator('#ed-objectives').boundingBox();
    expect(tutorial).not.toBeNull();
    expect(objectives).not.toBeNull();
    const overlap =
      tutorial!.x < objectives!.x + objectives!.width &&
      tutorial!.x + tutorial!.width > objectives!.x &&
      tutorial!.y < objectives!.y + objectives!.height &&
      tutorial!.y + tutorial!.height > objectives!.y;
    expect(overlap, `${viewport.width}x${viewport.height} ${JSON.stringify({ tutorial, objectives })}`).toBe(false);
  }
});

test('a peaceful victory summarises optional achievements and offers the next mission', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    for (const id of [
      'caral_pyramid_mayor',
      'caral_pyramid_central',
      'caral_pyramid_quarry',
      'caral_pyramid_lesser',
      'caral_pyramid_gallery',
      'caral_pyramid_huanca',
    ]) {
      g.visitHeritage(id);
    }
    g.mission.objState.set('obj_asamblea', 'completed');
    g.mission.objState.set('obj_complejos', 'completed');
    g.mission.update(0.1, 0);
    g.showVictory(0);
  });
  const victory = page.locator('.ed-overlay', { hasText: 'VICTORIA' });
  await expect(victory).toBeVisible();
  await expect(victory).toContainText('Logros opcionales');
  await expect(victory).toContainText('Convoca una asamblea comunal');
  await expect(victory).toContainText('Recorre los seis complejos piramidales');
  await expect(victory).toContainText('Continuar: El Oráculo de Chavín');
  await expect(victory).not.toContainText('Bajas infligidas');
  await victory.getByRole('button', { name: /Continuar: El Oráculo de Chavín/ }).click();
  await page.waitForURL(/mission=m2_chavin/);
  await expect(page.locator('.ed-overlay', { hasText: 'El Oráculo de Chavín' })).toBeVisible({ timeout: 30_000 });
});

test('a Caral Blender pyramid opens an educational field card', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => document.querySelector('#ed-tutorial')?.remove());
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.camera.moveTo(164, 34, true);
    g.camera.setHeight(48);
    g.camera.update(1, 0);
  });
  await page.waitForTimeout(800);
  const point = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const model = g.landmark.getObjectByName('caral_pyramid_mayor');
    const box = new window.THREE.Box3().setFromObject(model);
    // Mid-height of the heritage volume: its top (the 7-person-tall in-use pyramid) can fall off-screen
    // with this close test camera.
    const center = box.getCenter(new window.THREE.Vector3());
    const projected = center.project(g.camera.camera);
    return { x: (projected.x * 0.5 + 0.5) * window.innerWidth, y: (-projected.y * 0.5 + 0.5) * window.innerHeight };
  });
  await page.mouse.click(point.x, point.y);
  const bottom = page.locator('#ed-bottom');
  await expect(bottom).toBeVisible();
  await expect(bottom).toContainText('Pirámide Mayor y Plaza Central');
  await expect(bottom).toContainText('Caral Alto');
  await expect(bottom).toContainText('documentado');
  await expect(bottom).toContainText('Dossier de Caral');
  const visit = page.getByRole('button', { name: /Visitar/ });
  await expect(visit).toHaveCount(1);
  await visit.dispatchEvent('pointerdown', { button: 0 });
  await page.evaluate(() => (window as unknown as { game: any }).game.hud.update(0.2, 0));
  await expect(bottom).toContainText('Ficha registrada');
  const complexes = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.objState.set('a2_excedente', 'completed');
    g.mission.update(0.1, 0);
    document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    g.mission.update(0.1, 0);
    for (const name of ['central', 'quarry', 'lesser', 'gallery', 'huanca']) {
      g.visitHeritage(`caral_pyramid_${name}`);
    }
    g.mission.update(0.1, 0);
    return g.mission.getObjectiveState('obj_complejos');
  });
  expect(complexes).toBe('completed');
});

test('the Caral canal is an earth trace that follows the relief', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate((waterLift) => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const group = g.canalGroup;
    const children = group ? [...group.children] : [];
    const water = group?.getObjectByName('canal_water');
    const position = water?.geometry?.attributes?.position;
    let maxError = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    if (position) {
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        maxError = Math.max(maxError, Math.abs(y - g.terrain.getHeight(x, z) - waterLift));
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    return {
      path: g.canalPath?.length ?? 0,
      names: children.map((child: any) => child.name),
      boxes: children.filter((child: any) => child.geometry?.type === 'BoxGeometry').length,
      maxError,
      span: maxY - minY,
      hasGate: !!group?.getObjectByName('canal_gate'),
    };
  }, CANAL_WATER_LIFT);
  expect(state.path).toBeGreaterThanOrEqual(4);
  expect(state.names).toEqual(expect.arrayContaining(['canal_bed', 'canal_water', 'canal_bank', 'canal_gate']));
  expect(state.boxes, 'Caral must not use the legacy canal boxes').toBe(0);
  expect(state.maxError, 'the water ribbon follows the terrain').toBeLessThan(0.02);
  expect(state.span).toBeGreaterThan(0.1);
  expect(state.hasGate).toBe(true);
});

test('opening the Caral canal raises the yield at its banks', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.objState.set('a2_campos', 'completed');
    g.mission.update(0.1, 0);
  });
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const path = (g.canalPath ?? []) as Array<{ x: number; z: number }>;
    return {
      site: g.canalSite,
      open: g.isCanalOpen(),
      yield: g.farmYieldAt(g.canalSite.x, g.canalSite.z),
      waterColor: g.canalWater.material.color.getHex(),
      gateVisible: g.canalGate.visible,
      irrigation: path.map((p) => g.authoredCanalAt(p.x, p.z)),
    };
  });
  expect(before.site).not.toBeNull();
  expect(before.open).toBe(false);
  expect(before.irrigation.length).toBeGreaterThanOrEqual(4);
  expect(before.irrigation.every((value: number) => value === 0)).toBe(true);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.camera.moveTo(g.canalSite.x, g.canalSite.z, true);
  });
  await page.waitForTimeout(800);
  const point = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const path = (g.canalPath ?? []) as Array<{ x: number; z: number }>;
    const p = path[Math.floor(path.length / 2)] ?? g.canalSite;
    const water = new window.THREE.Vector3(p.x, g.terrain.getHeight(p.x, p.z) + 0.1, p.z);
    const projected = water.project(g.camera.camera);
    return { x: (projected.x * 0.5 + 0.5) * window.innerWidth, y: (-projected.y * 0.5 + 0.5) * window.innerHeight };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('#ed-bottom')).toContainText('Canal comunal del valle');
  await page.getByRole('button', { name: /Abrir compuerta/ }).dispatchEvent('pointerdown', { button: 0 });
  await expect(page.locator('.ed-toast', { hasText: 'chacras' })).toBeVisible();
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.update(0.1, 0);
    g.hud.update(0.2, 0);
  });
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const path = (g.canalPath ?? []) as Array<{ x: number; z: number }>;
    return {
      open: g.isCanalOpen(),
      yield: g.farmYieldAt(g.canalSite.x, g.canalSite.z),
      waterColor: g.canalWater.material.color.getHex(),
      gateVisible: g.canalGate.visible,
      irrigation: path.map((p) => g.authoredCanalAt(p.x, p.z)),
    };
  });
  expect(after.open).toBe(true);
  expect(after.yield).toBeGreaterThan(before.yield);
  expect(after.waterColor).not.toBe(before.waterColor);
  expect(after.gateVisible).toBe(false);
  expect(after.irrigation.every((value: number) => value > 0.9)).toBe(true);
  const riego = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.update(0.2, 0);
    return g.mission.objState.get('a2_canal');
  });
  expect(riego).toBe('completed');

  const guards = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const path = (g.canalPath ?? []) as Array<{ x: number; z: number }>;
    const p = path[Math.floor(path.length / 2)];
    const spot = g.findFreeSpot(g.canalSite.x + 10, g.canalSite.z + 10, 4);
    return { onCanal: g.canPlace(p.x, p.z, 4), reserved: g.isReserved(p.x, p.z), offCanal: !!spot };
  });
  expect(guards.onCanal, 'a building cannot sit in the channel').toBe(false);
  expect(guards.reserved, 'props stay off the canal corridor').toBe(true);
  expect(guards.offCanal, 'the valley beside the canal remains buildable').toBe(true);

  const farm = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const path = (g.canalPath ?? []) as Array<{ x: number; z: number }>;
    const i = Math.floor(path.length / 2);
    const a = path[i - 1] ?? path[i];
    const b = path[i + 1] ?? path[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    let placed: any = null;
    for (const side of [-4, 4]) {
      const x = path[i].x - (dz / len) * side;
      const z = path[i].z + (dx / len) * side;
      if (!g.executeCommand({ kind: 'place', building: 'farm', x, z })) continue;
      placed = [...g.buildings.values()].find(
        (candidate: any) => candidate.kind === 'farm' && candidate.owner === 0 && candidate.pos.x === x,
      );
      if (placed) break;
    }
    if (!placed) return null;
    placed.constructionComplete = true;
    return { id: placed.id as number, foodOpen: placed.foodAmount as number };
  });
  expect(farm).not.toBeNull();
  const closed = await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    g.toggleCanal();
    return { open: g.isCanalOpen(), food: g.buildings.get(id).foodAmount as number };
  }, farm!.id);
  expect(closed.open).toBe(false);
  expect(closed.food).toBeLessThan(farm!.foodOpen);
});

test('the Caral canal water follows the gate, the flood and the drought', async ({ page }) => {
  await boot(page);
  const states = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const snap = () => ({
      gate: g.canalGate.visible as boolean,
      color: g.canalWater.material.color.getHex() as number,
      opacity: g.canalWater.material.opacity as number,
    });
    g.environment.wet_season = 0;
    g.environment.drought = 0;
    if (g.isCanalOpen()) g.toggleCanal();
    g.updateCanalVisual();
    const closed = snap();
    g.toggleCanal();
    const open = snap();
    g.toggleCanal();
    g.startEnvironmentalEvent('wet_season');
    g.updateEnvironment(100);
    const wet = snap();
    g.startEnvironmentalEvent('drought');
    g.updateEnvironment(100);
    const drought = snap();
    return { closed, open, wet, drought };
  });
  expect(states.closed.gate, 'the stone plug is in place when the gate is closed').toBe(true);
  expect(states.open.gate, 'the plug is removed when the gate opens').toBe(false);
  expect(states.open.color).not.toBe(states.closed.color);
  expect(states.wet.gate, 'the flood runs through even with the gate closed').toBe(false);
  expect(states.drought.gate, 'the drought dries the channel and brings the plug back').toBe(true);
  expect(states.drought.color).toBe(states.closed.color);
});

test('the drought dries the irrigated field and the replanted one is not a fresh harvest', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const canal = g.canalPath?.[2];
    if (!canal) return null;
    const center = [...g.buildings.values()].find((b: any) => b.kind === 'center' && b.owner === 0);
    const spot = g.findFreeSpot(canal.x + 1.5, canal.z, 3);
    const farm = g.placeBuilding('farm', spot.x, spot.z);
    if (!farm) return null;
    if (!g.isCanalOpen()) g.toggleCanal();
    // The yield on the trace itself carries the irrigation bonus; the farm may sit on the bank.
    const wet = g.farmYieldAt(canal.x, canal.z);
    const wetReserve = farm.foodAmount as number;
    g.startEnvironmentalEvent('drought');
    for (let i = 0; i < 45; i++) g.updateEnvironment(1);
    const dry = g.farmYieldAt(canal.x, canal.z);
    const dryReserve = farm.foodAmount as number;
    farm.foodAmount = 0;
    g.players[0].resources.wood = 100;
    g.replantFarm(farm.id);
    return { wet, dry, wetReserve, dryReserve, replanted: farm.foodAmount as number };
  });
  expect(out).not.toBeNull();
  expect(out!.dry, 'the dried field loses the canal bonus and half its potential').toBeLessThan(out!.wet * 0.5);
  expect(out!.dryReserve).toBeLessThan(out!.wetReserve);
  expect(out!.replanted).toBeLessThan(out!.wetReserve);
});

test('the Chacra and communal-store panels explain their historical abstractions', async ({ page }) => {
  await boot(page);
  const ids = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.kind === 'center' && b.owner === 0);
    if (!center) return null;
    const place = (kind: string, dx: number, dz: number): number | null => {
      const spot = g.findFreeSpot(center.pos.x + dx, center.pos.z + dz, 3);
      if (!spot || !g.executeCommand({ kind: 'place', building: kind, x: spot.x, z: spot.z })) return null;
      const b = [...g.buildings.values()].find(
        (candidate: any) => candidate.kind === kind && candidate.owner === 0 && candidate.pos.x === spot.x,
      );
      if (!b) return null;
      b.constructionComplete = true;
      return b.id as number;
    };
    return { farm: place('farm', 7, 0), mill: place('mill', -7, 0) };
  });
  expect(ids).not.toBeNull();
  expect(ids!.farm).not.toBeNull();
  expect(ids!.mill).not.toBeNull();
  const bottom = page.locator('#ed-bottom');
  await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    g.selectBuilding(id);
    g.hud.update(0.2, 0);
  }, ids!.farm);
  await expect(bottom).toContainText('Chacra');
  await expect(bottom).toContainText('abstracción jugable');
  await expect(bottom).toContainText('Dossier de Caral');
  await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    g.selectBuilding(id);
    g.hud.update(0.2, 0);
  }, ids!.mill);
  await expect(bottom).toContainText('Depósito comunal');
  await expect(bottom).toContainText('depósito comunal');
  await expect(bottom).toContainText('Dossier de Caral');
});

test('the Plaza Central card activates the communal assembly', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.objState.set('a2_excedente', 'completed');
    g.mission.update(0.1, 0);
    document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    g.selectedHeritage = 'caral_pyramid_mayor';
    g.hud.update(0.2, 0);
  });
  const bottom = page.locator('#ed-bottom');
  await expect(bottom).toContainText('Pirámide Mayor y Plaza Central');
  await expect(page.getByRole('button', { name: /Convocar asamblea/ })).toHaveCount(1);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (!g.startAssembly()) return 'not-started';
    const worker = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    if (!worker) return 'no-worker';
    worker.pos.set(g.siteCenter.x, g.landmark.position.y, g.siteCenter.z);
    g.mission.update(25, 0);
    return g.getAssemblyState();
  });
  expect(state).toBe('completed');
});

test(
  'the heritage panel skips the disabled certainty chip when binding hotkeys',
  { tag: '@smoke' },
  async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      g.selectedUnits = [];
      g.selectedBuilding = null;
      g.selectedHeritage = 'caral_pyramid_mayor';
      g.hud.update(0.2, 0);
    });
    const bottom = page.locator('#ed-bottom');
    await expect(bottom.locator('.ed-card.disabled .ed-hotkey')).toHaveCount(0);
    await expect(bottom.locator('#ed-commands .ed-command').first().locator('.ed-hotkey')).toHaveText('Q');
  },
);

test('the deliver button is disabled and explains what is missing', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.mission.objState.set('a3_muros', 'activo');
    g.players[0].resources.stone = 0;
    g.selectedUnits = [];
    g.selectedBuilding = null;
    g.selectedHeritage = 'caral_pyramid_mayor';
    const site = g.siteCenter;
    for (const u of g.units.values()) {
      if (u.owner === 0 && u.kind === 'worker') u.pos.set(site.x + 60, u.pos.y, site.z + 60);
    }
    g.hud.update(0.2, 0);
  });
  const disabled = page.locator('#ed-commands .ed-command.disabled');
  await expect(disabled).toContainText('Acerca un obrero a la obra');

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const site = g.siteCenter;
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    if (!worker) throw new Error('no worker');
    worker.pos.set(site.x, g.terrain.getHeight(site.x, site.z), site.z);
    g.hud.update(0.2, 0);
  });
  await expect(page.locator('#ed-commands .ed-command.disabled')).toContainText('Faltan 50 de piedra');

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.players[0].resources.stone = 60;
    g.hud.update(0.2, 0);
  });
  await expect(page.locator('#ed-commands .ed-command').first()).toContainText('Entregar materiales');
  await expect(page.locator('#ed-commands .ed-command.disabled')).toHaveCount(0);
});

test('the tutorial names the configured build keys', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const text = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.settings.hotkeys = { ...g.settings.hotkeys, buildHouse: 'z' };
    g.camera.setKeymap(g.settings.hotkeys);
    g.tutorial.applySave({
      idx: 0,
      stepId: 'house',
      begun: true,
      finished: false,
      delay: 0,
      stepTime: 0,
      base: { houses: 0, barracks: 0, soldiers: 0, farms: 0, mills: 0, markets: 0 },
    });
    g.tutorial.update(0);
    return document.getElementById('ed-tutorial')?.textContent ?? '';
  });
  expect(text).toContain('Z');
  expect(text).not.toContain('{key:');
});

test('the Act IV departure waits for the beach cohort, not the fishers', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const mission = g.mission;
    mission.objState.set('a4_partida', 'activo');
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker');
    const banks = [...g.resourceNodes.values()].filter((n: any) => n.kind === 'fishing');
    const anchor = mission.getObjectiveAnchor('a4_partida');
    const dist = (n: any) => Math.hypot(anchor.x - n.pos.x, anchor.z - n.pos.z);
    const nearest = [...banks].sort((a: any, b: any) => dist(a) - dist(b))[0];
    // Worst case: the whole crew works the bank closest to the departure marker.
    workers.forEach((u: any) => {
      u.pos.set(nearest.pos.x, g.terrain.getHeight(nearest.pos.x, nearest.pos.z), nearest.pos.z);
    });
    for (let i = 0; i < 20 * 20; i++) mission.update(1 / 20, i / 20);
    const afterFishers = mission.getObjectiveState('a4_partida');
    // Three of the community walk to the dedicated departure marker.
    workers.slice(0, 3).forEach((u: any) => {
      u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    });
    for (let i = 0; i < 20 * 20; i++) mission.update(1 / 20, i / 20);
    return {
      afterFishers,
      afterCohort: mission.getObjectiveState('a4_partida'),
      anchor,
      walkable: g.pathfinder.isWalkable(anchor.x, anchor.z),
      workers: workers.length,
      nearestBank: dist(nearest),
      banks: banks.length,
    };
  });
  expect(state.afterFishers, 'fishers on the banks must not end the mission').toBe('activo');
  expect(state.walkable, 'the departure marker sits on walkable beach').toBe(true);
  expect(state.workers).toBeGreaterThanOrEqual(3);
  expect(state.banks).toBeGreaterThanOrEqual(3);
  expect(state.nearestBank, 'even the closest bank is outside the hold').toBeGreaterThan(15);
  expect(state.afterCohort).toBe('completed');
});

test('a load keeps the optional assembly waiting for the player', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.mission.objState.set('a2_excedente', 'completed');
    const save = g.mission.toSave();
    g.mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]: [string, string]) => [id, id === 'a2_excedente' ? 'completed' : st]),
    });
    return {
      pending: g.mission.getObjectiveState('obj_asamblea'),
      canCall: g.mission.canActivateObjective('obj_asamblea'),
    };
  });
  expect(state.pending).toBe('pendiente');
  expect(state.canCall).toBe(true);
});

test('the Caral build menu uses period names and icons', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    g.selectedUnits = [worker.id];
    g.selectedBuilding = null;
    g.selectedHeritage = null;
    g.hud.renderBottom();
    const cards = [...document.querySelectorAll('#ed-bottom .ed-card')].map((el) => ({
      name: el.querySelector('.nm')?.textContent ?? '',
      icon: el.querySelector('.ic')?.textContent ?? '',
    }));
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    g.selectedUnits = [];
    g.selectedBuilding = center.id;
    g.hud.renderBottom();
    const title = document.querySelector('#ed-bottom h3')?.textContent ?? '';
    const centerCards = [...document.querySelectorAll('#ed-bottom .ed-card .nm')].map((el) => el.textContent ?? '');
    return { cards, title, centerCards };
  });
  const mill = state.cards.find((card) => card.name.includes('Depósito comunal'));
  const farm = state.cards.find((card) => card.name.includes('Chacra'));
  expect(mill, 'the mill is the communal store').toBeTruthy();
  expect(farm?.icon, 'Caral does not use the maize icon').toBe('🌱');
  expect(state.cards.some((card) => card.name.includes('Troje'))).toBe(false);
  expect(state.title).toContain('Recinto comunal');
  expect(state.title).not.toContain('Plaza Mayor');
  expect(state.centerCards).not.toContain('Canal de Regadío');
  expect(state.centerCards.some((name) => name.includes('Shicras'))).toBe(true);
});

test('the Caral site uses the source LOD and has no procedural fallback mesh', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const model = g.landmark.getObjectByName('caral_site');
    let meshes = 0;
    g.landmark.traverse((o: any) => {
      if (o.isMesh) meshes++;
    });
    return {
      procedural: !!g.setpiece,
      model: !!model,
      sourceLod: model?.userData?.sourceLod ?? null,
      meshes,
    };
  });
  expect(state.procedural).toBe(false);
  expect(state.model).toBe(true);
  expect(state.sourceLod).toBe(1);
  expect(state.meshes).toBeGreaterThan(3);
});

test('a loaded Caral save keeps the Blender setpiece', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.visitHeritage('caral_pyramid_mayor');
    g.mission.objState.set('a2_excedente', 'completed');
    g.mission.update(0.1, 0);
    document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    g.mission.objState.set('a3_shicras', 'completed');
    g.mission.update(0.1, 0);
    g.mission.objState.set('a3_obra_relleno', 'completed');
    g.mission.update(0.1, 0);
    g.toggleCanal();
    g.startAssembly();
    g.saveMatch();
  });
  await page.goto('/?load=1&fog=0&low=1&noloop=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      const landmark = g?.landmark;
      return (
        g?.setpiece === null &&
        g?.isHeritageVisited('caral_pyramid_mayor') === true &&
        g?.isCanalOpen() === true &&
        g?.getAssemblyState() === 'activo' &&
        g?.sitePhase === 'fill' &&
        landmark?.getObjectByName('caral_site') !== undefined &&
        landmark?.getObjectByName('caral_pyramid_mayor') !== undefined &&
        landmark?.getObjectByName('caral_anfiteatro') !== undefined &&
        ['central', 'quarry', 'lesser', 'gallery', 'huanca'].every(
          (name) => landmark?.getObjectByName(`caral_pyramid_${name}`) !== undefined,
        )
      );
    },
    null,
    { timeout: 30_000 },
  );
});

test('the authored Caral geometry is deterministic for the same mission seed', async ({ page }) => {
  const read = () =>
    page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const names = [
        'caral_pyramid_mayor',
        'caral_pyramid_central',
        'caral_pyramid_quarry',
        'caral_pyramid_lesser',
        'caral_pyramid_gallery',
        'caral_pyramid_huanca',
        'caral_anfiteatro',
        'caral_site',
      ];
      return names.map((name) => {
        const object = g.landmark.getObjectByName(name);
        if (!object) return `${name}:missing`;
        const p = object.getWorldPosition(new window.THREE.Vector3());
        let verts = 0;
        object.traverse((o: any) => {
          if (o.isMesh && o.geometry?.attributes?.position) verts += o.geometry.attributes.position.count;
        });
        return `${name}:${p.x.toFixed(2)}:${p.y.toFixed(2)}:${p.z.toFixed(2)}:${verts}`;
      });
    });
  await boot(page);
  const first = await read();
  await boot(page);
  const second = await read();
  expect(first).toEqual(second);
});
