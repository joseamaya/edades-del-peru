import { expect, test } from '@playwright/test';
import { OPENING_BASE_CLEARANCE } from '../../src/core/Config';
import { CARAL_CIRCULAR_ALTAR, CARAL_SITE_BLOCKERS } from '../../src/model/defs/caralSite';

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
      baseDistLower: base ? Math.hypot(base.pos.x - 100, base.pos.z - 152.5) : null,
      riverWest: g.terrain.isWater(4, 90),
      cityDry: !g.terrain.isWater(100, 90),
      upperDry: !g.terrain.isWater(100, 30),
      lowerDry: !g.terrain.isWater(100, 152),
    };
  });
  expect(state.siteId).toBe('caral_site');
  expect(state.focusX).toBeCloseTo(0.52, 3);
  expect(state.focusZ).toBeCloseTo(0.277, 3);
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
  expect(state.baseDistLower).toBeLessThan(50);
  expect(state.riverWest).toBe(true);
  expect(state.cityDry).toBe(true);
  expect(state.upperDry).toBe(true);
  expect(state.lowerDry).toBe(true);
  expect(state.landmarkX).toBe(0);
  expect(state.landmarkZ).toBe(0);
  expect(state.anchorX).toBe(100);
  expect(state.anchorZ).toBe(30);
  expect(errors).toEqual([]);
});

test('the authored site blocks monument footprints without sealing the city', async ({ page }) => {
  const errors = await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return {
      mayor: g.pathfinder.isWalkable(100, 30),
      anfiteatro: g.pathfinder.isWalkable(100, 152),
      plaza: g.pathfinder.isWalkable(100, 53),
      base: g.pathfinder.isWalkable(52, 161),
      route: g.pathfinder.pathfind(52, 161, 100, 53).length,
      buildOnMayor: g.canPlace(100, 30, 4),
      buildInValley: g.canPlace(30, 120, 4),
      buildInGap: g.canPlace(102, 136.5, 4),
      residentialWall: g.pathfinder.isWalkable(100, 110),
      openValley: g.pathfinder.isWalkable(30, 120),
      baseBuildable: !!g.findFreeSpot(60.5, 161.3, 4),
      commandBlocked: (() => {
        const before = g.buildings.size;
        const ok = g.executeCommand({ kind: 'place', building: 'house', x: 100, z: 30 });
        return { ok, before, after: g.buildings.size };
      })(),
    };
  });
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
  await expect(objectives).toContainText('Prepara dos campos de cultivo');
  await expect(objectives).toContainText('0/2');
  await expect(objectives).toContainText('0/1');
  await expect(objectives).toContainText(/0:0\d \/ 5:00/);
  await expect(objectives).not.toContainText('Troje');
  await expect(objectives).not.toContainText('250/500');
  await expect(objectives).not.toContainText('canal comunal');
  await expect(objectives).not.toContainText('0/6');
  const plaza = page.locator('#ed-bottom');
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectedHeritage = 'caral_pyramid_mayor';
    g.hud.update(0.2, 0);
  });
  await expect(plaza).not.toContainText('Convocar asamblea');

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.objState.set('obj_agricultura', 'completed');
    g.mission.update(0.1, 0);
    g.hud.update(0.2, 0);
  });
  await expect(objectives).toContainText('Construye un depósito comunal');
  await expect(objectives).toContainText('250/500');

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.objState.set('obj_almacenamiento', 'completed');
    g.mission.update(0.1, 0);
    g.hud.update(0.2, 0);
  });
  await expect(objectives).toContainText('Abre la compuerta del canal comunal');

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.visitHeritage('caral_pyramid_mayor');
    g.mission.objState.set('obj_complejo', 'completed');
    g.mission.update(0.1, 0);
    g.hud.update(0.2, 0);
  });
  await expect(objectives).toContainText('1/6');
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectedHeritage = 'caral_pyramid_mayor';
    g.hud.update(0.2, 0);
  });
  await expect(plaza).toContainText('Convocar asamblea');

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.players[0].resources.food = 500;
    g.mission.update(0.1, 0);
    g.hud.update(0.2, 0);
  });
  await expect(objectives).toContainText('✔Reúne 500 de comida');
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

test('the Caral dwellings read at unit scale and keep the Plaza Mayor dominant', async ({ page }) => {
  await boot(page);
  const heights = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead);
    const house = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'house' && !b.dead);
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.garrisonedIn);
    const height = (obj: any) => {
      obj.updateWorldMatrix(true, true);
      return new window.THREE.Box3().setFromObject(obj).getSize(new window.THREE.Vector3()).y;
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
      const p = g.pathfinder;
      const inside = (x: number, z: number) =>
        blockers.find((b: any) => Math.abs(x - b.x) <= b.w / 2 && Math.abs(z - b.z) <= b.d / 2);
      const path = p.pathfind(75, 30, 125, 30);
      const aimed = p.pathfind(75, 30, 100, 30);
      const aimedEnd = aimed[aimed.length - 1];
      return {
        navCell: p.grid.cell,
        monuments: blockers.filter((b: any) => !p.isWalkable(b.x, b.z)).length,
        path: path.map((pt: any) => ({ x: pt.x, z: pt.z })),
        open: p.isWalkable(100, 100) && p.isWalkable(100, 53),
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
    expect(overlap, `${viewport.width}x${viewport.height}`).toBe(false);
  }
});

test('a peaceful victory summarises optional achievements and closes the chapter', async ({ page }) => {
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
    g.toggleCanal();
    g.mission.objState.set('obj_riego', 'completed');
    g.mission.objState.set('obj_complejos', 'completed');
    g.mission.update(0.1, 0);
    g.showVictory(0);
  });
  const victory = page.locator('.ed-overlay', { hasText: 'VICTORIA' });
  await expect(victory).toBeVisible();
  await expect(victory).toContainText('Logros opcionales');
  await expect(victory).toContainText('Abre la compuerta del canal comunal');
  await expect(victory).toContainText('Recorre los seis complejos piramidales');
  await expect(victory).toContainText('Fin de la primera campaña');
  await expect(victory).not.toContainText('Bajas infligidas');
  await victory.getByRole('button', { name: /Volver a campañas/ }).click();
  await expect(page.locator('.ed-campaign-panel')).toBeVisible({ timeout: 15_000 });
});

test('a Caral Blender pyramid opens an educational field card', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => document.querySelector('#ed-tutorial')?.remove());
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.camera.moveTo(100, 34, true);
    g.camera.setHeight(48);
    g.camera.update(1, 0);
  });
  await page.waitForTimeout(800);
  const point = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const model = g.landmark.getObjectByName('caral_pyramid_mayor');
    const box = new window.THREE.Box3().setFromObject(model);
    const center = box.getCenter(new window.THREE.Vector3());
    center.y = box.max.y - 0.5;
    const projected = center.project(g.camera.camera);
    return { x: (projected.x * 0.5 + 0.5) * window.innerWidth, y: (-projected.y * 0.5 + 0.5) * window.innerHeight };
  });
  await page.mouse.click(point.x, point.y);
  const bottom = page.locator('#ed-bottom');
  await expect(bottom).toBeVisible();
  await expect(bottom).toContainText('Gran Pirámide y Plaza Central');
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
    g.mission.objState.set('obj_complejo', 'completed');
    g.mission.update(0.1, 0);
    for (const name of ['central', 'quarry', 'lesser', 'gallery', 'huanca']) {
      g.visitHeritage(`caral_pyramid_${name}`);
    }
    g.mission.update(0.1, 0);
    return g.mission.getObjectiveState('obj_complejos');
  });
  expect(complexes).toBe('completed');
});

test('opening the Caral canal raises the yield at its banks', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.objState.set('obj_almacenamiento', 'completed');
    g.mission.update(0.1, 0);
  });
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return {
      site: g.canalSite,
      open: g.isCanalOpen(),
      yield: g.farmYieldAt(g.canalSite.x, g.canalSite.z),
      waterColor: g.canalWater.material.color.getHex(),
      gateY: g.canalGate.position.y,
    };
  });
  expect(before.site).not.toBeNull();
  expect(before.open).toBe(false);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.camera.moveTo(g.canalSite.x, g.canalSite.z, true);
  });
  await page.waitForTimeout(800);
  const point = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const box = new window.THREE.Box3().setFromObject(g.canalGroup);
    const center = box.getCenter(new window.THREE.Vector3());
    center.y = box.max.y - 0.5;
    const projected = center.project(g.camera.camera);
    return { x: (projected.x * 0.5 + 0.5) * window.innerWidth, y: (-projected.y * 0.5 + 0.5) * window.innerHeight };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('#ed-bottom')).toContainText('Canal comunal del valle');
  await page.getByRole('button', { name: /Abrir compuerta/ }).dispatchEvent('pointerdown', { button: 0 });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.update(0.1, 0);
    g.hud.update(0.2, 0);
  });
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return {
      open: g.isCanalOpen(),
      yield: g.farmYieldAt(g.canalSite.x, g.canalSite.z),
      waterColor: g.canalWater.material.color.getHex(),
      gateY: g.canalGate.position.y,
    };
  });
  expect(after.open).toBe(true);
  expect(after.yield).toBeGreaterThan(before.yield);
  expect(after.waterColor).not.toBe(before.waterColor);
  expect(after.gateY).toBeGreaterThan(before.gateY);
  const riego = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.update(0.2, 0);
    return g.mission.objState.get('obj_riego');
  });
  expect(riego).toBe('completed');

  const farm = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const site = g.canalSite;
    if (!g.executeCommand({ kind: 'place', building: 'farm', x: site.x, z: site.z })) return null;
    const placed = [...g.buildings.values()].find((b: any) => b.kind === 'farm' && b.owner === 0);
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

test('the Andén and Troje panels explain their historical abstractions', async ({ page }) => {
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
  await expect(bottom).toContainText('Andén');
  await expect(bottom).toContainText('abstracción jugable');
  await expect(bottom).toContainText('Dossier de Caral');
  await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    g.selectBuilding(id);
    g.hud.update(0.2, 0);
  }, ids!.mill);
  await expect(bottom).toContainText('Troje');
  await expect(bottom).toContainText('depósito comunal');
  await expect(bottom).toContainText('Dossier de Caral');
});

test('the Plaza Central card activates the communal assembly', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.mission.objState.set('obj_complejo', 'completed');
    g.mission.update(0.1, 0);
    g.selectedHeritage = 'caral_pyramid_mayor';
  });
  const bottom = page.locator('#ed-bottom');
  await expect(bottom).toContainText('Gran Pirámide y Plaza Central');
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
    g.mission.objState.set('obj_complejo', 'completed');
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
