import { test, expect } from '@playwright/test';

test('the lightweight landing defers the game bundle until entry', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const started = Date.now();
  await page.goto('/');
  await expect(page.locator('#landing button')).toBeVisible();
  const landingMs = Date.now() - started;
  expect(requests.some((url) => /\/boot(?:-|\.)/g.test(url))).toBe(false);
  await page.locator('#landing button').click();
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await expect(page.locator('.ed-menu-shell')).toBeVisible();
  expect(landingMs).toBeLessThan(2_000);
  expect(requests.some((url) => /\/boot(?:-|\.)/g.test(url))).toBe(true);
  expect(errors).toEqual([]);
});
