import { test, expect } from '@playwright/test';

test('post-game stats open every tab and expose the replay actions', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.ais.length = 0;
    g.matchStats.recordGather(0, 'food', 120);
    g.matchStats.recordGather(1, 'wood', 80);
    let t = 0;
    for (let i = 0; i < 60 * 12; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    g.endGame(0);
  });
  await expect(page.locator('.ed-overlay', { hasText: 'VICTORIA' })).toBeVisible();
  const tabs = page.locator('.ed-stats-tabs button');
  await expect(tabs).toHaveCount(5);
  await tabs.filter({ hasText: 'Economía' }).click();
  await expect(page.locator('.ed-stats-chart svg')).toBeVisible();
  await tabs.filter({ hasText: 'Militar' }).click();
  await expect(page.locator('.ed-stats-table')).toBeVisible();
  await tabs.filter({ hasText: 'Tecnología' }).click();
  await expect(page.locator('.ed-stats-body')).toContainText('tecnologías');
  await tabs.filter({ hasText: 'Línea de tiempo' }).click();
  await expect(page.locator('.ed-stats-chart svg')).toBeVisible();
  await expect(page.locator('[data-stats-replay="watch"]')).toBeVisible();
  await expect(page.locator('[data-stats-replay="save"]')).toBeVisible();
});
