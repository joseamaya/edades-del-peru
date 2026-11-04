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
  await expect(page.getByRole('button', { name: /Escaramuza/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cómo jugar/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Opciones/ })).toBeVisible();
  await expect(page.getByText(/CAMPAÑA DISPONIBLE/)).toBeVisible();
});

test('options and skirmish labels come from the i18n table', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('button', { name: /Opciones/ }).click();
  await expect(page.getByRole('heading', { name: 'OPCIONES' })).toBeVisible();
  await expect(page.getByText('Efectos cinematográficos')).toBeVisible();
  await expect(page.getByText('Velocidad de cámara')).toBeVisible();
  await expect(page.locator('.ed-menu-kicker', { hasText: 'ATAJOS' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).click();

  await page.getByRole('button', { name: /Escaramuza/ }).click();
  await expect(page.getByRole('heading', { name: 'Configura tu partida' })).toBeVisible();
  await expect(page.getByText('Periodo histórico')).toBeVisible();
  await expect(page.getByText('Dificultad')).toBeVisible();
  await expect(page.getByText('Rival (contemporáneo)')).toBeVisible();
  await expect(page.getByText('Recursos iniciales')).toBeVisible();
});
