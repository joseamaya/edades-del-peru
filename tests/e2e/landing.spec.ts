import { test, expect } from '@playwright/test';

test('the lightweight landing defers the game bundle until entry', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const started = Date.now();
  await page.goto('/');
  await expect(page.locator('#landing button')).toBeVisible();
  const landingMs = Date.now() - started;
  await page.locator('#landing button').click();
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await expect(page.locator('.ed-menu-shell')).toBeVisible();
  expect(landingMs).toBeLessThan(10_000);
  expect(errors).toEqual([]);
  await context.close();
});
