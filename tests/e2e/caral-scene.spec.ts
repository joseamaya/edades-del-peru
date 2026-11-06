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
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  return errors;
}

test('the Caral base is dressed with visual-only household props', { tag: '@smoke' }, async ({ page }) => {
  const errors = await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const dressing = g.settlementDressing ?? [];
    const overlays = g.settlements ?? [];
    const hasCrops = overlays.some((o: any) =>
      o.group.children.some((c: any) => c.name === 'crops' && c.geometry?.attributes?.position),
    );
    const mesh = dressing[0]?.group.children[0];
    return {
      count: dressing.length,
      verts: mesh?.geometry?.attributes?.position?.count ?? 0,
      hasCrops,
      landmark: !!g.landmark,
    };
  });
  expect(state.count).toBeGreaterThan(0);
  expect(state.verts).toBeGreaterThan(0);
  expect(state.hasCrops).toBe(true);
  expect(state.landmark).toBe(true);
  expect(errors).toEqual([]);
});

test('the Supe valley carries visual plots, paths and riverbank reeds', { tag: '@smoke' }, async ({ page }) => {
  const errors = await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const valley = (g.settlements ?? []).find((o: any) => o.group.name === 'caral-valley');
    const fieldsMesh = valley?.group.getObjectByName('fields');
    const crops = valley?.group.getObjectByName('crops');
    const borders = valley?.group.getObjectByName('field-borders');
    const paths = valley?.group.getObjectByName('roads');
    const reeds = g.scene.getObjectByName('props_totora');
    const fields = valley?.plan.fields ?? [];
    const nodesInField = [...(g.resourceNodes?.values() ?? [])].filter((node: any) =>
      fields.some(
        (f: any) => Math.abs(node.pos.x - f.x) <= f.size / 2 + 0.4 && Math.abs(node.pos.z - f.z) <= f.size / 2 + 0.4,
      ),
    ).length;
    return {
      fields: valley?.plan.fields.length ?? 0,
      fieldVerts: fieldsMesh?.geometry.attributes.position.count ?? 0,
      cropVerts: crops?.geometry.attributes.position.count ?? 0,
      borderVerts: borders?.geometry.attributes.position.count ?? 0,
      pathVerts: paths?.geometry.attributes.position.count ?? 0,
      reeds: reeds?.count ?? 0,
      nodesInField,
    };
  });
  expect(state.fields).toBeGreaterThanOrEqual(3);
  expect(state.fieldVerts).toBeGreaterThan(0);
  expect(state.cropVerts).toBeGreaterThan(0);
  expect(state.borderVerts).toBeGreaterThan(0);
  expect(state.pathVerts).toBeGreaterThan(0);
  expect(state.reeds).toBeGreaterThan(5);
  expect(state.nodesInField).toBe(0);
  expect(errors).toEqual([]);
});

test('the Caral dressing is deterministic for the same mission seed', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const first = await page.evaluate(
    () =>
      (window as unknown as { game: any }).game.settlementDressing[0].group.children[0].geometry.attributes.position
        .count,
  );
  await boot(page);
  const second = await page.evaluate(
    () =>
      (window as unknown as { game: any }).game.settlementDressing[0].group.children[0].geometry.attributes.position
        .count,
  );
  expect(second).toBe(first);
});

test('the Blender vegetation kit replaces the procedural huarango, willow and totora', async ({ page }) => {
  const errors = await boot(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game: any }).game;
      return g.trees.hasKit('algarrobo') && g.trees.hasKit('sauce') && !!g.scene.getObjectByName('props_kit_totora');
    },
    null,
    { timeout: 30_000 },
  );
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const count = (name: string) => {
      let n = 0;
      g.scene.traverse((o: any) => {
        if (o.name === name && o.isInstancedMesh) n = Math.max(n, o.count);
      });
      return n;
    };
    const procedural = g.scene.getObjectByName('props_totora');
    const trunk = g.scene.getObjectByName('trees_trunk');
    const highestUsed = g.trees.slots.reduce((m: number, s: any, i: number) => (s.used ? i : m), -1);
    // Picking resolves a packed kit instance back to its resource node.
    const T = (window as unknown as { THREE: any }).THREE;
    const tree = g.trees.slots.find((s: any) => s.used && s.visible && s.variant === 'algarrobo');
    const ray = new T.Raycaster(new T.Vector3(tree.x + 0.3, tree.y + 20, tree.z + 0.3), new T.Vector3(0, -1, 0));
    const hits: { id: number }[] = [];
    g.trees.raycast(ray, hits);
    return {
      picked: hits.some((h) => h.id === tree.id),
      trunkCount: trunk?.count ?? -1,
      highestUsed,
      huarango: count('trees_kit_huarango_lod0') + count('trees_kit_huarango_lod1'),
      totoraKit: count('props_kit_totora'),
      totora: procedural?.count ?? 0,
      proceduralVisible: procedural?.visible ?? true,
      canes: count('props_kit_cana_brava') + count('props_kit_carrizo'),
    };
  });
  expect(state.huarango).toBeGreaterThan(0);
  expect(state.picked).toBe(true);
  // Procedural tree meshes draw only up to the highest used slot, not all 700.
  expect(state.trunkCount).toBe(state.highestUsed + 1);
  expect(state.trunkCount).toBeLessThan(700);
  expect(state.totoraKit).toBe(state.totora);
  expect(state.proceduralVisible).toBe(false);
  expect(state.canes).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('riparian deer and bird flocks graze the Supe with the Blender fauna kit', async ({ page }) => {
  const errors = await boot(page);
  await page.waitForFunction(
    () => {
      const w = (window as unknown as { game: any }).game.wildlife;
      return w.hasKit('deer') && w.hasKit('riparian_bird');
    },
    null,
    { timeout: 30_000 },
  );
  const fauna = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.wildlife.update(1 / 60); // positions are set by update; the page runs with noloop
    return g.wildlife.debugSnapshot().map((a: any) => ({
      species: a.species,
      water: g.terrain.isWater(a.x, a.z),
      above: a.y - g.terrain.getHeight(a.x, a.z),
    }));
  });
  const deer = fauna.filter((a: any) => a.species === 'deer');
  const birds = fauna.filter((a: any) => a.species === 'riparian_bird');
  expect(deer.length).toBeGreaterThanOrEqual(3);
  expect(birds.length).toBeGreaterThanOrEqual(3);
  for (const d of deer) {
    expect(d.water).toBe(false);
    expect(Math.abs(d.above)).toBeLessThan(0.2);
  }
  for (const b of birds) expect(b.above).toBeGreaterThan(0.2);
  expect(errors).toEqual([]);
});
