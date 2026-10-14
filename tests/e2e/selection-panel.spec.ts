import { test, expect } from '@playwright/test';

async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the command panel appears only with a selection', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const bottom = page.locator('#ed-bottom');

  // nothing selected -> the panel is hidden
  await expect(bottom).toBeHidden();

  // a worker selected -> visible (with the build menu)
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const w = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    g.selectUnits([w.id]);
    for (let i = 0; i < 20; i++) g.update(1 / 60, i / 60);
  });
  await expect(bottom).toBeVisible();

  // a building selected -> visible
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectUnits([]);
    g.selectedBuilding = [...g.buildings.values()].find((b: any) => b.owner === 0).id;
    for (let i = 0; i < 20; i++) g.update(1 / 60, i / 60);
  });
  await expect(bottom).toBeVisible();

  // deselected -> hidden again
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectedUnits = [];
    g.selectedBuilding = null;
    for (let i = 0; i < 20; i++) g.update(1 / 60, i / 60);
  });
  await expect(bottom).toBeHidden();
});
