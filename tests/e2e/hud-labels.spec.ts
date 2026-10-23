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
  await expect(header).toContainText('Horizonte Medio');
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
  await expect(bottom).toContainText('Daño 3.3');
  const text = await bottom.innerText();
  expect(text).not.toMatch(/\d+\.\d{3,}/);
});

test('the main menu names maps and geographies in Spanish', { tag: '@smoke' }, async ({ page }) => {
  await boot(page, '/');
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
