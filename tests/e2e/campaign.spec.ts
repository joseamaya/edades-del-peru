import { test, expect } from '@playwright/test';

test('muestra el prólogo histórico antes de la campaña', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const intro = page.locator('.ed-overlay', { hasText: 'La Senda del Sol' });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('una de las primeras civilizaciones del mundo');
  await intro.getByRole('button', { name: /Ver misiones/ }).click();
  await expect(page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' })).toBeVisible();
});

test('el briefing de la misión incluye contexto y fuentes', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await expect(overlay).toContainText('Contexto');
  await expect(overlay).toContainText('¿Sabías que…?');
  await expect(overlay.getByText('Fuentes históricas')).toBeVisible();
});

test('el códice abre con periodos, civilizaciones y dossiers', async ({ page }) => {
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

test('el tutorial guía en la primera misión', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  const tutorial = page.locator('#ed-tutorial');
  await expect(tutorial).toBeVisible({ timeout: 15_000 });
  await expect(tutorial).toContainText('Selecciona a tus obreros');
  await expect(tutorial).toContainText('Paso 1 / 5');
});
