import { test, expect } from '@playwright/test';

async function boot(page: import('@playwright/test').Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the top bar shows the historical period, not the internal era', { tag: '@smoke' }, async ({ page }) => {
  // period 3 = Middle Horizon (600–1000 CE), which shares the Inca tech level with
  // the Late Horizon; the bar must not read "Tahuantinsuyo".
  await boot(page, '/?play=1&seed=777&fog=0&low=1&period=3');
  const header = page.locator('#ed-era');
  await expect(header).toContainText('Horizonte Medio', { timeout: 20_000 });
  await expect(header).toContainText('600–1000');
  await expect(header).not.toContainText('Tahuantinsuyo');
});

test('the victory screen shows the match period, not the era', async ({ page }) => {
  await boot(page, '/?play=1&seed=777&fog=0&low=1&period=3');
  const text = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.showVictory(0);
    return document.querySelector('.ed-overlay')?.textContent ?? '';
  });
  expect(text).toContain('Periodo: Horizonte Medio');
  expect(text).not.toContain('Era alcanzada');
});

test('unit stats are formatted without floating-point noise', { tag: '@smoke' }, async ({ page }) => {
  await boot(page, '/?play=1&seed=777&fog=0&low=1');
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectUnits([...g.units.values()].filter((u: any) => u.owner === 0).map((u: any) => u.id));
  });
  const bottom = page.locator('#ed-bottom');
  await expect(bottom).toContainText('Daño 3.3', { timeout: 20_000 });
  const text = await bottom.innerText();
  expect(text).not.toMatch(/\d+\.\d{3,}/);
});

test('the skirmish setup names maps and geographies in Spanish', { tag: '@smoke' }, async ({ page }) => {
  await boot(page, '/?menu=1');
  await page.getByRole('button', { name: /Escaramuza/ }).click();
  const options = await page.$$eval('option', (els) => els.map((e) => e.textContent ?? ''));
  expect(options).toContain('Costa / litoral');
  expect(options.some((o) => o.trim() === 'coast')).toBe(false);
  expect(options).toContain('Andes / sierra');
});

test('the FPS overlay is hidden unless explicitly enabled', async ({ page }) => {
  await boot(page, '/?play=1&seed=777&fog=0&low=1');
  await expect(page.locator('#ed-fps')).toBeHidden();

  await boot(page, '/?play=1&seed=777&fog=0&low=1&fps=1');
  await expect(page.locator('#ed-fps')).toBeVisible();
});

test('the skirmish setup shows the civ bonus and applies starting resources', async ({ page }) => {
  await boot(page, '/?menu=1');
  await page.getByRole('button', { name: /Escaramuza/ }).click();
  await expect(page.locator('.ed-skirmish-info')).toBeVisible();
  await expect(page.locator('.ed-skirmish-info')).toContainText('moche');
  await expect(page.locator('.ed-map-preview')).toBeVisible();

  await page.locator('.ed-field', { hasText: 'Recursos iniciales' }).locator('select').selectOption('rich');
  await page.locator('.ed-field', { hasText: 'Población máxima' }).locator('select').selectOption('150');
  await page.getByRole('button', { name: /INICIAR ESCARAMUZA/ }).click();
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.units?.size > 0, null, {
    timeout: 30_000,
  });
  const bank = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return { food: g.players[0].resources.food, cap: g.players[0].populationCap };
  });
  expect(bank.food).toBe(500);
  expect(bank.cap).toBe(150);
});

test('F1 and ? toggle the shortcut panel', { tag: '@smoke' }, async ({ page }) => {
  await boot(page, '/?play=1&seed=777&fog=0&low=1');
  const help = page.locator('#ed-help');
  await expect(help).toBeVisible();
  await page.keyboard.press('F1');
  await expect(help).toBeHidden();
  await page.keyboard.press('?');
  await expect(help).toBeVisible();
});
