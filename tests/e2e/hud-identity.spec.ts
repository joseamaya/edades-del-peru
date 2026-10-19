import { test, expect, type Page } from '@playwright/test';

async function bootMission(page: Page): Promise<void> {
  await page.goto('/?play=1&mission=m5_yahuar_pampa&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the mission briefing shows commander portrait cards', async ({ page }) => {
  await bootMission(page);
  await page.waitForSelector('.ed-cmd-card');
  const out = await page.evaluate(() => ({
    cards: document.querySelectorAll('.ed-cmd-card').length,
    portraits: document.querySelectorAll('.ed-cmd-card .ed-portrait').length,
    names: [...document.querySelectorAll('.ed-cmd-info b')].map((e) => e.textContent),
  }));
  expect(out.cards).toBe(2);
  expect(out.portraits).toBe(2);
  expect(out.names).toContain('Cusi Yupanqui');
});

test('a named dialogue speaker gets their portrait', async ({ page }) => {
  await bootMission(page);
  await page.evaluate(() => {
    // exercise the speaker auto-detection used by mission triggers
    (window as unknown as { game: any }).game.mission.triggerDialogue('Miguel Grau: —El enemigo es superior.', 5);
  });
  await expect(page.locator('#ed-dialogue')).toHaveClass(/show/);
  await expect(page.locator('#ed-dialogue .who')).toHaveText('Miguel Grau');
  await expect(page.locator('#ed-dialogue .pic .ed-portrait')).toHaveCount(1);
});
