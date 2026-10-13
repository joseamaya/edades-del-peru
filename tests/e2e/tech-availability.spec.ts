import { test, expect, Page } from '@playwright/test';

async function boot(page: Page, period: number): Promise<void> {
  await page.goto(`/?play=1&seed=777&fog=0&low=1&period=${period}`);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

/** Spawn a building and try to queue a tech through the central guard. */
async function queueTech(page: Page, building: string, tech: string): Promise<boolean> {
  return page.evaluate(
    ({ building, tech }) => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      const c = g.playerCenter(0);
      const b = g.spawnScriptedBuilding(building, 0, c.x + 12, c.z);
      g.players[0].resources = { food: 9999, wood: 9999, silver: 9999, stone: 9999 };
      g.update(1 / 60, 0); // assign the runtime context (period)
      return b.queueTech(tech);
    },
    { building, tech },
  );
}

test('techs are not offered outside their historical window (chasquis in the Republic)', async ({ page }) => {
  await boot(page, 8); // REPUBLIC
  expect(await queueTech(page, 'center', 'swift_chasquis')).toBe(false);
});

test('Inca techs are available to the Inca, not to the Spanish', async ({ page }) => {
  await boot(page, 5); // LATE_HORIZON (Inca)
  expect(await queueTech(page, 'center', 'swift_chasquis')).toBe(true);
  expect(await queueTech(page, 'barracks', 'amauta_words')).toBe(true);

  await boot(page, 6); // VICEROYALTY (Spain)
  expect(await queueTech(page, 'barracks', 'amauta_words')).toBe(false);
});
