import { expect, test } from '@playwright/test';

const URL = '/?mission=m1_caral&seed=3000&fog=0&low=1&noloop=1';

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
  return errors;
}

test('the Caral scenario builds the documented Upper and Lower halves', { tag: '@smoke' }, async ({ page }) => {
  const errors = await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const plan = g.setpiecePlan;
    let verts = 0;
    let meshes = 0;
    g.setpiece?.group.traverse((o: any) => {
      if (o.isMesh && o.geometry?.attributes?.position) {
        verts += o.geometry.attributes.position.count;
        meshes++;
      }
    });
    const upperKeepout = plan.keepout[0];
    const lowerKeepout = plan.keepout[1];
    const ford = plan.placements.find((p: any) => p.kind === 'ford');
    // Local rect test: page.evaluate runs in the browser and cannot import the
    // Node-side terrain helper.
    const inRect = (n: any, r: any) => Math.abs(n.pos.x - r.x) <= r.rx && Math.abs(n.pos.z - r.z) <= r.rz;
    const upperResources = [...g.resourceNodes.values()].filter((n: any) => inRect(n, upperKeepout)).length;
    const lowerResources = [...g.resourceNodes.values()].filter((n: any) => inRect(n, lowerKeepout)).length;
    const fordResources = ford
      ? [...g.resourceNodes.values()].filter((n: any) =>
          inRect(n, { x: ford.x, z: ford.z, rx: ford.width / 2, rz: ford.depth / 2 }),
        ).length
      : -1;
    const base = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    const amph = plan.placements.find((p: any) => p.modularAnchor);
    const anf = g.landmark?.getObjectByName('caral_anfiteatro');
    const anfPos = anf?.getWorldPosition(new window.THREE.Vector3());
    const moduleNames = ['central', 'quarry', 'lesser', 'gallery', 'huanca'];
    const modules = moduleNames.map((name) => {
      const model = g.landmark?.getObjectByName(`caral_pyramid_${name}`);
      const placement = plan.placements.find((p: any) => p.name === name);
      const pos = model?.getWorldPosition(new window.THREE.Vector3());
      return {
        name,
        present: !!model,
        x: pos?.x ?? null,
        z: pos?.z ?? null,
        planX: placement?.x ?? null,
        planZ: placement?.z ?? null,
      };
    });
    return {
      hasPlan: !!plan,
      placements: plan.placements.length,
      main: plan.mainPyramid.name,
      meshes,
      verts,
      landmarkX: g.landmark?.position.x ?? null,
      landmarkZ: g.landmark?.position.z ?? null,
      modularPyramid: !!g.landmark?.getObjectByName('caral_pyramid_mayor'),
      modularAnfiteatro: !!anf,
      modules,
      heritageIds: [
        'caral_pyramid_mayor',
        'caral_pyramid_central',
        'caral_pyramid_quarry',
        'caral_pyramid_lesser',
        'caral_pyramid_gallery',
        'caral_pyramid_huanca',
        'caral_anfiteatro',
      ].map((name) => [name, g.landmark?.getObjectByName(name)?.userData?.heritageId ?? null]),
      proceduralPlacements: g.setpiece?.group?.userData?.placements ?? [],
      anfX: anfPos?.x ?? null,
      anfZ: anfPos?.z ?? null,
      amphX: amph?.x ?? null,
      amphZ: amph?.z ?? null,
      mainX: plan.mainPyramid.x,
      mainZ: plan.mainPyramid.z,
      upperZ: plan.upper.z,
      lowerZ: plan.lower.z,
      baseInLower: base ? Math.abs(base.pos.z - plan.lower.z) < 4 : false,
      fordDry: !g.terrain.isWater(64, 70),
      riverSideWet: g.terrain.isWater(52, 70),
      fordWalkable: g.pathfinder.isWalkable(64, 70),
      fordReachable: base ? g.pathfinder.reachable(base.pos.x, base.pos.z, plan.upper.x, plan.upper.z) : false,
      fordPathLength: base ? g.pathfinder.pathfind(base.pos.x, base.pos.z, plan.upper.x, plan.upper.z).length : 0,
      upperResources,
      lowerResources,
      fordResources,
      landscapeMeshes: g.landscape?.group?.children?.length ?? 0,
    };
  });
  expect(state.hasPlan).toBe(true);
  expect(state.placements).toBeGreaterThan(30);
  expect(state.main).toBe('greater');
  expect(state.meshes).toBeGreaterThan(0);
  expect(state.verts).toBeGreaterThan(5000);
  expect(state.landmarkX).toBeCloseTo(state.mainX, 3);
  expect(state.landmarkZ).toBeCloseTo(state.mainZ, 3);
  expect(state.modularPyramid).toBe(true);
  expect(state.modularAnfiteatro).toBe(true);
  for (const module of state.modules) {
    expect(module.present, module.name).toBe(true);
    expect(module.x, module.name).toBeCloseTo(module.planX!, 3);
    expect(module.z, module.name).toBeCloseTo(module.planZ!, 3);
    expect(state.proceduralPlacements, module.name).not.toContain(module.name);
  }
  for (const [name, heritageId] of state.heritageIds) expect(heritageId, name).toBe(name);
  expect(state.proceduralPlacements).not.toContain('amphitheatre');
  expect(state.proceduralPlacements).not.toContain('round_altar');
  expect(state.proceduralPlacements).not.toContain('bench_temple');
  expect(state.anfX).toBeCloseTo(state.amphX, 3);
  expect(state.anfZ).toBeCloseTo(state.amphZ, 3);
  expect(state.lowerZ).toBeGreaterThan(state.upperZ);
  expect(state.lowerZ - state.upperZ).toBeGreaterThan(40);
  expect(state.baseInLower).toBe(true);
  expect(state.fordDry).toBe(true);
  expect(state.riverSideWet).toBe(true);
  expect(state.fordWalkable).toBe(true);
  expect(state.fordReachable).toBe(true);
  expect(state.fordPathLength).toBeGreaterThan(0);
  expect(state.upperResources).toBe(0);
  expect(state.lowerResources).toBe(0);
  expect(state.fordResources).toBe(0);
  expect(state.landscapeMeshes).toBe(0);
  expect(errors).toEqual([]);
});

test('a Caral Blender pyramid opens an educational field card', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as unknown as { game: any }).game.camera.moveTo(64, 36, true));
  await page.waitForTimeout(800);
  const point = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const model = g.landmark.getObjectByName('caral_pyramid_mayor');
    const box = new window.THREE.Box3().setFromObject(model);
    const center = box.getCenter(new window.THREE.Vector3()).project(g.camera.camera);
    return { x: (center.x * 0.5 + 0.5) * window.innerWidth, y: (-center.y * 0.5 + 0.5) * window.innerHeight };
  });
  await page.mouse.click(point.x, point.y);
  const bottom = page.locator('#ed-bottom');
  await expect(bottom).toBeVisible();
  await expect(bottom).toContainText('Gran Pirámide y Plaza Central');
  await expect(bottom).toContainText('Caral Alto');
  await expect(bottom).toContainText('documentado');
  await expect(bottom).toContainText('Dossier de Caral');
  await page.getByRole('button', { name: /Visitar/ }).click();
  await expect(bottom).toContainText('Ficha registrada');
  await expect(page.locator('#ed-toasts')).toContainText('Ficha registrada');
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    for (const name of ['central', 'quarry', 'lesser', 'gallery', 'huanca']) {
      g.visitHeritage(`caral_pyramid_${name}`);
    }
  });
  await page.waitForFunction(
    () => (window as unknown as { game?: any }).game?.mission?.objState.get('obj_complejos') === 'completed',
    null,
    { timeout: 5_000 },
  );
});

test('opening the Caral canal raises the yield at its banks', async ({ page }) => {
  await boot(page);
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return {
      site: g.canalSite,
      open: g.isCanalOpen(),
      yield: g.farmYieldAt(g.canalSite.x, g.canalSite.z),
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
    const center = box.getCenter(new window.THREE.Vector3()).project(g.camera.camera);
    return { x: (center.x * 0.5 + 0.5) * window.innerWidth, y: (-center.y * 0.5 + 0.5) * window.innerHeight };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('#ed-bottom')).toContainText('Canal comunal del valle');
  await page.getByRole('button', { name: /Abrir compuerta/ }).click();
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return { open: g.isCanalOpen(), yield: g.farmYieldAt(g.canalSite.x, g.canalSite.z) };
  });
  expect(after.open).toBe(true);
  expect(after.yield).toBeGreaterThan(before.yield);
  await page.waitForFunction(
    () => (window as unknown as { game?: any }).game?.mission?.objState.get('obj_riego') === 'completed',
    null,
    { timeout: 5_000 },
  );

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

test('the Caral city rebuilds the full procedural plan when a modular pyramid fails', async ({ page }) => {
  await page.route('**/*caral_pyramid_central_lod0.glb*', (route) => {
    if (route.request().url().includes('?')) return route.continue();
    return route.abort();
  });
  await boot(page, false);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return (
        g?.setpiece?.group?.userData?.proceduralLower === true && !g.landmark?.getObjectByName('caral_pyramid_central')
      );
    },
    null,
    { timeout: 15_000 },
  );
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    let meshes = 0;
    g.setpiece?.group?.traverse((o: any) => {
      if (o.isMesh) meshes++;
    });
    return {
      proceduralLower: g.setpiece?.group?.userData?.proceduralLower,
      central: !!g.landmark?.getObjectByName('caral_pyramid_central'),
      anfiteatro: !!g.landmark?.getObjectByName('caral_anfiteatro'),
      meshes,
    };
  });
  expect(state.proceduralLower).toBe(true);
  expect(state.central).toBe(false);
  expect(state.anfiteatro).toBe(false);
  expect(state.meshes).toBeGreaterThan(0);
});

test('a loaded Caral save keeps the Blender setpiece', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.visitHeritage('caral_pyramid_mayor');
    g.toggleCanal();
    g.saveMatch();
  });
  await page.goto('/?load=1&fog=0&low=1&noloop=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      const landmark = g?.landmark;
      return (
        g?.setpiece?.group?.userData?.proceduralLower === false &&
        g?.isHeritageVisited('caral_pyramid_mayor') === true &&
        g?.isCanalOpen() === true &&
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

test('the Caral city geometry is deterministic for the same mission seed', async ({ page }) => {
  await boot(page);
  const first = await page.evaluate(() =>
    (window as unknown as { game: any }).game.setpiecePlan.placements
      .map((p: any) => `${p.kind}:${p.name ?? ''}:${p.x.toFixed(2)}:${p.z.toFixed(2)}`)
      .join('|'),
  );
  await boot(page);
  const second = await page.evaluate(() =>
    (window as unknown as { game: any }).game.setpiecePlan.placements
      .map((p: any) => `${p.kind}:${p.name ?? ''}:${p.x.toFixed(2)}:${p.z.toFixed(2)}`)
      .join('|'),
  );
  expect(second).toBe(first);
});
