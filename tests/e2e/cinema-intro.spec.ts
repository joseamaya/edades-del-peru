import { test, expect } from '@playwright/test';

const CINEMA_URL = '/?mission=m_tarapaca&seed=777&fog=0&low=1';

test(
  'the Tarapacá cinema intro advances one beat per key and hands over to the briefing',
  { tag: '@smoke' },
  async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(CINEMA_URL);
    const cinema = page.locator('.ed-cine');
    await expect(cinema).toBeVisible({ timeout: 30_000 });
    await expect(cinema.locator('.ed-cine-title')).toHaveText('La quebrada');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: 'review/cinema-still.png' });

    // One advance per key: a focused button must not also fire its own click.
    await page.keyboard.press('Enter');
    await expect(cinema.locator('.ed-cine-title')).toHaveText('Tres columnas');
    const map = page.locator('.cine-map-svg');
    await expect(map).toHaveCount(1);
    // The map draws the mission's three columns and the dashed Pachica reinforcement.
    await expect(map.locator('.cine-map-route-label')).toHaveCount(4);
    await expect(map.getByText('1.ª columna')).toBeVisible();
    await expect(map.getByText('2.ª columna')).toBeVisible();
    await expect(map.getByText('3.ª columna')).toBeVisible();
    await expect(map.getByText('Refuerzos')).toBeVisible();
    await page.waitForTimeout(9200);
    await page.screenshot({ path: 'review/cinema-map.png' });

    // Escape skips the remaining beats and opens the mission briefing.
    await page.keyboard.press('Escape');
    await expect(page.locator('.ed-briefing')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.ed-cine')).toHaveCount(0);
    expect(errors).toEqual([]);
  },
);

test('Escape on the first beat skips the film without showing the map', { tag: '@smoke' }, async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(CINEMA_URL);
  const cinema = page.locator('.ed-cine');
  await expect(cinema).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.ed-briefing')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.ed-cine')).toHaveCount(0);
  await expect(page.locator('.cine-map-svg')).toHaveCount(0);
});
