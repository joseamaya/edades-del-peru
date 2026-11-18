import type { Page } from '@playwright/test';

/** Start a campaign mission from its briefing, as a player would. */
export async function startMission(page: Page): Promise<void> {
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  await start.waitFor({ state: 'visible', timeout: 30_000 });
  await start.click();
  await page
    .locator('.ed-overlay')
    .filter({ hasText: 'COMENZAR MISIÓN' })
    .waitFor({ state: 'detached', timeout: 15_000 })
    .catch(() => {});
}
