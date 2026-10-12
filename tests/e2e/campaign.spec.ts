import { test, expect } from '@playwright/test';

test('shows the historical prologue before the campaign', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const intro = page.locator('.ed-overlay', { hasText: 'La Senda del Sol' });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('una de las primeras civilizaciones del mundo');
  await intro.getByRole('button', { name: /Ver misiones/ }).click();
  await expect(page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' })).toBeVisible();
});

test('the mission briefing includes context and sources', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await expect(overlay).toContainText('Contexto');
  await expect(overlay).toContainText('¿Sabías que…?');
  await expect(overlay.getByText('Fuentes históricas')).toBeVisible();
});

test('the codex opens with periods, civilizations and dossiers', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });
  await page.getByRole('button', { name: /Códice/ }).click();
  const codex = page.locator('#ed-codex');
  await expect(codex).toBeVisible();
  await expect(codex).toContainText('Códice del Perú');
  await codex.getByRole('button', { name: /Civilizaciones/ }).click();
  await expect(codex.locator('.ed-codex-nav')).toContainText('Caral-Supe');
  await codex.getByRole('button', { name: /Dossiers/ }).click();
  await expect(codex.locator('.ed-codex-content')).toContainText('Fuentes');
});

test('the tutorial guides in the first mission', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  const tutorial = page.locator('#ed-tutorial');
  // the first step appears after ~1.2s of game time; be generous on slow runners
  await expect(tutorial).toBeVisible({ timeout: 30_000 });
  await expect(tutorial).toContainText('Selecciona a tus obreros');
  await expect(tutorial).toContainText('Paso 1 / 5');
});

test('the missions with corrected rosters boot with units and no errors', { tag: '@smoke' }, async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ids = ['m3_moche_recuay', 'm5_yahuar_pampa', 'm6_chimu_inca', 'm7_tupac_amaru', 'm9_guerra_pacifico'];
  for (const id of ids) {
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });
    const info = await page.evaluate(() => {
      const g = (window as unknown as { game: { units: Map<number, unknown>; buildings: Map<number, unknown> } }).game;
      return { units: g.units.size, buildings: g.buildings.size };
    });
    expect(info.units, `${id} has no units`).toBeGreaterThan(0);
    expect(info.buildings, `${id} has no buildings`).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
