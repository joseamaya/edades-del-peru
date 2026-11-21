import { test, expect, type Page } from '@playwright/test';

async function bootMission(page: Page): Promise<void> {
  await page.goto('/?play=1&mission=m5_yahuar_pampa&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the mission briefing shows commander portrait cards @smoke', async ({ page }) => {
  await bootMission(page);
  await page.waitForSelector('.ed-cmd-card');
  const out = await page.evaluate(() => ({
    cards: document.querySelectorAll('.ed-cmd-card').length,
    portraits: document.querySelectorAll('.ed-cmd-card .ed-portrait').length,
    names: [...document.querySelectorAll('.ed-cmd-info b')].map((e) => e.textContent),
    stylized: document.querySelectorAll('.ed-cmd-info em').length,
  }));
  expect(out.cards).toBe(2);
  expect(out.portraits).toBe(2);
  expect(out.names).toContain('Cusi Yupanqui');
  // pre-Hispanic figures have no attested likeness: both cards are marked as such
  expect(out.stylized).toBe(2);
});

test('a named dialogue speaker gets their portrait @smoke', async ({ page }) => {
  await bootMission(page);
  await page.evaluate(() => {
    // exercise the speaker auto-detection used by mission triggers
    (window as unknown as { game: any }).game.mission.triggerDialogue('Miguel Grau: —El enemigo es superior.', 5);
  });
  await expect(page.locator('#ed-dialogue')).toHaveClass(/show/);
  await expect(page.locator('#ed-dialogue .who')).toHaveText('Miguel Grau');
  await expect(page.locator('#ed-dialogue .pic .ed-portrait')).toHaveCount(1);
  // the redundant "Nombre:" prefix is stripped from the body
  await expect(page.locator('#ed-dialogue .txt')).toHaveText('—El enemigo es superior.');
});

test('a short historical name resolves to the commander card', async ({ page }) => {
  await bootMission(page);
  await page.evaluate(() => {
    (window as unknown as { game: any }).game.mission.triggerDialogue('Cáceres: —Sostened la línea.', 5);
  });
  await expect(page.locator('#ed-dialogue .who')).toHaveText('Andrés A. Cáceres');
  await expect(page.locator('#ed-dialogue .pic .ed-portrait')).toHaveCount(1);
  await expect(page.locator('#ed-dialogue .txt')).toHaveText('—Sostened la línea.');
});

test('a colon in prose is not read as the speaker', async ({ page }) => {
  await bootMission(page);
  const line = 'El algodón del valle baja a la costa: con él, Áspero teje sus redes.';
  await page.evaluate((text) => {
    (window as unknown as { game: any }).game.mission.triggerDialogue(text, 5);
  }, line);
  // The narrator speaks, and the clause stays in the body instead of becoming the name.
  await expect(page.locator('#ed-dialogue .who')).toHaveText('Cusi Yupanqui');
  await expect(page.locator('#ed-dialogue .txt')).toHaveText(line);
});
