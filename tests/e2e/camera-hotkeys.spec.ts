import { test, expect, type Page } from '@playwright/test';

async function boot(page: Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.ais.length = 0;
  });
}

test('camera markers save and recall with F1-F4', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as unknown as { game: any }).game.camera.focusOn(40, 50));
  await page.keyboard.press('Control+F2');
  await page.evaluate(() => (window as unknown as { game: any }).game.camera.focusOn(90, 95));
  await page.keyboard.press('F2');
  const target = await page.evaluate(() => (window as unknown as { game: any }).game.camera.getTarget());
  expect(target.x).toBeCloseTo(40, 0);
  expect(target.z).toBeCloseTo(50, 0);
});

test('remapping a shortcut persists in settings', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as unknown as { game: any }).game.hud.showOptions('main'));
  await page.locator('.ed-hotkey-row button').first().click();
  await page.keyboard.press('F9');
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('peru-settings');
    return raw ? JSON.parse(raw).hotkeys.toggleHelp : null;
  });
  expect(saved).toBe('f9');
});

test('the tech tree opens from the match', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as unknown as { game: any }).game.hud.showTechTree());
  await expect(page.locator('#ed-tech-tree')).toBeVisible();
  // In a match the tree lists only the current era of this civilization and mission.
  await expect(page.locator('#ed-tech-tree .ed-tree-era')).toHaveCount(1);
});

test('command panels show and respond to their keyboard binding', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    g.players[0].resources = { food: 500, wood: 500, silver: 500, stone: 500 };
    g.selectBuilding(center.id);
    g.hud.renderBottom();
    return center.productionQueue.length as number;
  });
  await expect(page.locator('#ed-bottom .ed-hotkey').first()).toBeVisible();
  const key = (await page.locator('#ed-bottom .ed-hotkey').first().textContent()) ?? '';
  await page.keyboard.press(key.trim().toLowerCase());
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    return center.productionQueue.length + (g.input.placingBuilding ? 100 : 0);
  });
  expect(after).toBeGreaterThan(before);
});
