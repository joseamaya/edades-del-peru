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

test('the Caral base is dressed with the household prop kit', { tag: '@smoke' }, async ({ page }) => {
  const errors = await boot(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return (g?.settlementDressing ?? []).some((d: any) =>
        d.group.children.some((c: any) => c.name.startsWith('props_kit_dressing_')),
      );
    },
    null,
    { timeout: 30_000 },
  );
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const dressing = g.settlementDressing ?? [];
    const overlays = g.settlements ?? [];
    const hasCrops = overlays.some((o: any) =>
      o.group.children.some((c: any) => c.name === 'crops' && c.geometry?.attributes?.position),
    );
    const kitMeshes = dressing.flatMap((d: any) =>
      d.group.children.filter((c: any) => c.name.startsWith('props_kit_dressing_')),
    );
    const visible = kitMeshes.filter((m: any) => m.visible);
    return {
      count: dressing.length,
      procedural: dressing.filter((d: any) => d.group.children.some((c: any) => c.name === 'dressing')).length,
      materials: [...new Set(kitMeshes.map((m: any) => m.name.replace(/^props_kit_dressing_|_lod[01]$/g, '')))].sort(),
      lods: [...new Set(kitMeshes.map((m: any) => m.name.slice(-4)))].sort(),
      visible: visible.length,
      shadows: kitMeshes.filter((m: any) => m.castShadow).length,
      verts: visible.reduce((n: number, m: any) => n + m.geometry.attributes.position.count, 0),
      hasCrops,
      landmark: !!g.landmark,
    };
  });
  expect(state.count).toBeGreaterThan(0);
  expect(state.procedural, 'the primitives are gone once the kit loads').toBe(0);
  expect(state.materials).toEqual(['canemat', 'plasterwhite', 'stone', 'wood']);
  expect(state.lods).toEqual(['lod0', 'lod1']);
  expect(state.visible).toBe(state.count * 4);
  // Sub-metre props skip the shadow pass: the buildings and units already anchor the shadows.
  expect(state.shadows).toBe(0);
  expect(state.verts).toBeGreaterThan(0);
  // No decal plots around Áspero: the player's chacras are the only fields.
  expect(state.hasCrops).toBe(false);
  expect(state.landmark).toBe(true);
  expect(errors).toEqual([]);
});

test(
  'the Supe valley paints fertile ground instead of decal plots, with riverbank reeds',
  { tag: '@smoke' },
  async ({ page }) => {
    const errors = await boot(page);
    const state = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const fields = g.caralValleyPlan?.fields ?? [];
      const nodesInField = [...(g.resourceNodes?.values() ?? [])].filter((node: any) =>
        fields.some(
          (f: any) => Math.abs(node.pos.x - f.x) <= f.size / 2 + 0.4 && Math.abs(node.pos.z - f.z) <= f.size / 2 + 0.4,
        ),
      ).length;
      const ground = fields.map((f: any) => g.terrain.data.getAuthoredGround(f.x, f.z));
      return {
        valleyOverlay: (g.settlements ?? []).some((o: any) => o.group.name === 'caral-valley'),
        fields: fields.length,
        fertile: ground.filter((w: number[]) => w && w[0] + w[1] > 0.7).length,
        reeds: g.scene.getObjectByName('props_totora')?.count ?? 0,
        nodesInField,
      };
    });
    expect(state.valleyOverlay).toBe(false);
    expect(state.fields).toBeGreaterThanOrEqual(3);
    // Every reserved plot sits on painted loam and grass.
    expect(state.fertile).toBe(state.fields);
    expect(state.reeds).toBeGreaterThan(5);
    expect(state.nodesInField).toBe(0);
    expect(errors).toEqual([]);
  },
);

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
    const variants = [...new Set(g.trees.slots.filter((s: any) => s.used).map((s: any) => s.variant))];
    // Picking resolves a packed kit instance back to its resource node.
    const T = (window as unknown as { THREE: any }).THREE;
    const tree = g.trees.slots.find((s: any) => s.used && s.visible && s.variant === 'algarrobo');
    const ray = new T.Raycaster(new T.Vector3(tree.x + 0.3, tree.y + 20, tree.z + 0.3), new T.Vector3(0, -1, 0));
    const hits: { id: number }[] = [];
    g.trees.raycast(ray, hits);
    return {
      picked: hits.some((h) => h.id === tree.id),
      trunkCount: trunk?.count ?? -1,
      trunkVisible: trunk?.visible ?? true,
      variants,
      kitCanopyVisible: g.scene.getObjectByName('trees_canopy_algarrobo')?.visible ?? true,
      huarango: count('trees_kit_huarango_lod0') + count('trees_kit_huarango_lod1'),
      totoraKit: count('props_kit_totora'),
      totora: procedural?.count ?? 0,
      proceduralVisible: procedural?.visible ?? true,
      canes: count('props_kit_cana_brava') + count('props_kit_carrizo'),
    };
  });
  expect(state.huarango).toBeGreaterThan(0);
  expect(state.picked).toBe(true);
  // Issue 393: Caral keeps only the kit-backed species, so it has no procedural tree mesh at all.
  expect(state.variants.length).toBeGreaterThan(0);
  expect(state.variants.every((variant: string) => variant === 'algarrobo' || variant === 'sauce')).toBe(true);
  expect(state.trunkVisible).toBe(false);
  expect(state.trunkCount).toBe(0);
  // The procedural canopy of a kit-drawn variant is hidden, so it costs no draw call.
  expect(state.kitCanopyVisible).toBe(false);
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
