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
      valleyProps: g.caralValleyProps?.length ?? 0,
      nodesInField,
    };
  });
  expect(state.fields).toBeGreaterThanOrEqual(3);
  expect(state.fieldVerts).toBeGreaterThan(0);
  expect(state.cropVerts).toBeGreaterThan(0);
  expect(state.borderVerts).toBeGreaterThan(0);
  expect(state.pathVerts).toBeGreaterThan(0);
  expect(state.reeds).toBeGreaterThan(5);
  expect(state.valleyProps).toBeGreaterThan(5);
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
