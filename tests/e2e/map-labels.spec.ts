import { expect, test, type Page } from '@playwright/test';

async function boot(page: Page, fog: number): Promise<void> {
  await page.goto(`/?mission=m1_caral&seed=3000&fog=${fog}&low=1&noloop=1&intro=0`);
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mapLabels, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    for (let i = 0; i < 12; i++) g.update(1 / 60, i / 60);
  });
}

test('m1 names the Supe river on the board', async ({ page }) => {
  await boot(page, 0);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const sprite = g.scene.getObjectByName('geo-label:Río Supe');
    return {
      names: g.placeNames.map((l: { text: string }) => l.text),
      visible: sprite?.visible ?? false,
      opacity: (sprite?.material as { opacity?: number } | undefined)?.opacity ?? 0,
    };
  });
  expect(state.names).toContain('Río Supe');
  expect(state.names).toContain('Áspero');
  expect(state.names).toContain('Caral');
  expect(state.visible).toBe(true);
  expect(state.opacity).toBeGreaterThan(0.5);
});

test('place names fade out when the camera zooms out to the whole map', async ({ page }) => {
  await boot(page, 0);
  const faded = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.camera.setHeight(200);
    for (let i = 0; i < 240; i++) g.update(1 / 60, i / 60);
    const sprite = g.scene.getObjectByName('geo-label:Río Supe');
    return { visible: sprite?.visible ?? false, zoom: g.camera.getZoom(), max: g.camera.maxZoom };
  });
  expect(faded.zoom).toBeCloseTo(faded.max, 0);
  expect(faded.visible).toBe(false);
});

test('place names respect the fog of war', async ({ page }) => {
  await boot(page, 1);
  const hidden = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const size = g.settings.mapSize;
    const label = g.placeNames.find((l: { x: number; z: number }) => !g.fow.isExplored(l.x * size, l.z * size));
    if (!label) return null;
    const sprite = g.scene.getObjectByName(`geo-label:${label.text}`);
    return { text: label.text, x: label.x, z: label.z, size, visible: sprite?.visible ?? true };
  });
  expect(hidden).not.toBeNull();
  expect(hidden!.visible).toBe(false);

  const revealed = await page.evaluate((info) => {
    const g = (window as unknown as { game: any }).game;
    g.fow.reveal(info.x * info.size, info.z * info.size, 40);
    for (let i = 0; i < 6; i++) g.update(1 / 60, i / 60);
    const sprite = g.scene.getObjectByName(`geo-label:${info.text}`);
    return sprite?.visible ?? false;
  }, hidden!);
  expect(revealed).toBe(true);
});
