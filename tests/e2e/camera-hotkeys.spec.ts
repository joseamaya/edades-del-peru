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
  await expect(page.locator('#ed-tech-tree .ed-tree-era')).toHaveCount(6);
});

test('command panels show their keyboard binding', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    g.selectBuilding(center.id);
    g.hud.renderBottom();
  });
  await expect(page.locator('#ed-bottom .ed-hotkey').first()).toBeVisible();
  await expect(page.locator('#ed-bottom .ed-hotkey')).not.toHaveCount(0);
});
