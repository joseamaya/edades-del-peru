import { test, expect } from '@playwright/test';

test(
  'the Tarapacá cinema intro advances one beat per key and hands over to the briefing',
  { tag: '@smoke' },
  async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?mission=m_tarapaca&seed=777&fog=0&low=1');
    const cinema = page.locator('.ed-cine');
    await expect(cinema).toBeVisible({ timeout: 30_000 });
    await expect(cinema.locator('.ed-cine-title')).toHaveText('La quebrada');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: 'review/cinema-still.png' });

    // One advance per key: a focused button must not also fire its own click.
    await page.keyboard.press('Enter');
    await expect(cinema.locator('.ed-cine-title')).toHaveText('Tres columnas');
    await expect(cinema).toHaveCount(1);
    await expect(page.locator('.cine-map-svg')).toHaveCount(1);
    // Let the three columns and the dashed reinforcement finish drawing before the capture.
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'review/cinema-map.png' });

    // Escape skips the remaining beats and opens the mission briefing.
    await page.keyboard.press('Escape');
    await expect(page.locator('.ed-briefing')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.ed-cine')).toHaveCount(0);
    expect(errors).toEqual([]);
  },
);
