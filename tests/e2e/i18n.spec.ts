import { test, expect, type Page } from '@playwright/test';

async function openMenu(page: Page): Promise<void> {
  await page.goto('/?menu=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the main menu keeps the Spanish UI copy', async ({ page }) => {
  await openMenu(page);
  await expect(page.getByRole('heading', { name: /EDADES\s+DEL PERÚ/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Campañas/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Escaramuza/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Cómo jugar/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Opciones/ })).toBeVisible();
  await expect(page.getByText('Tu senda · Campaña I de V')).toBeVisible();
  await expect(page.getByRole('button', { name: '▶ Jugar La Ciudad Sagrada' })).toBeVisible();
});

test('options and campaign labels come from the i18n table', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('button', { name: /Opciones/ }).click();
  await expect(page.getByRole('heading', { name: 'OPCIONES' })).toBeVisible();
  await expect(page.getByText('Efectos cinematográficos')).toBeVisible();
  await expect(page.getByText('Velocidad de cámara')).toBeVisible();
  await expect(page.locator('.ed-menu-kicker', { hasText: 'ATAJOS' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).click();

  await page.getByRole('button', { name: /Campañas/ }).click();
  await expect(page.getByRole('heading', { name: 'Campañas' })).toBeVisible();
  await expect(page.getByText('LA SENDA DEL SOL', { exact: true })).toBeVisible();
  await expect(page.getByText(/CAMPAÑA 1 DE 5/)).toBeVisible();
  await expect(page.getByText(/Cinco capítulos de la historia del Perú/)).toBeVisible();
  await expect(page.locator('.ed-campaign-card')).toHaveCount(5);
  await expect(page.getByText(/CAMPAÑA 5 DE 5/)).toBeVisible();
});
