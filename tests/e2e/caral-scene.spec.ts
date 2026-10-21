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
