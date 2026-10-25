import { expect, test } from '@playwright/test';

const URL = '/?mission=m1_caral&seed=3000&fog=0&low=1&noloop=1';

async function boot(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.setpiece !== undefined, null, {
    timeout: 30_000,
  });
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
    const amph = plan.placements.find((p: any) => p.kind === 'temple' && p.name === 'amphitheatre');
    const anf = g.landmark?.getObjectByName('caral_anfiteatro');
    const anfPos = anf?.getWorldPosition(new window.THREE.Vector3());
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

test('the Caral city keeps the procedural lower ensemble when the Anfiteatro GLB fails', async ({ page }) => {
  await page.route('**/*caral_anfiteatro_lod0.glb*', (route) => {
    if (route.request().url().includes('?')) return route.continue();
    return route.abort();
  });
  await boot(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return g?.setpiece?.group?.userData?.proceduralLower === true && !g.landmark?.getObjectByName('caral_anfiteatro');
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
      anfiteatro: !!g.landmark?.getObjectByName('caral_anfiteatro'),
      meshes,
    };
  });
  expect(state.proceduralLower).toBe(true);
  expect(state.anfiteatro).toBe(false);
  expect(state.meshes).toBeGreaterThan(0);
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
