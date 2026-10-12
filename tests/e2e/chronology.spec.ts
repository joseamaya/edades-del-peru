import { test, expect } from '@playwright/test';

test('training respects the chronology guard (no horses before 1532)', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1'); // default period: Early Intermediate
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && g.units.size > 0;
    },
    null,
    { timeout: 15_000 },
  );

  const res = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const c = g.playerCenter(0);
    const stable = g.spawnScriptedBuilding('stable', 0, c.x + 12, c.z);
    const barracks = g.spawnScriptedBuilding('barracks', 0, c.x - 12, c.z);
    g.players[0].resources = { food: 9999, wood: 9999, silver: 9999, stone: 9999 };
    g.update(1 / 60, 0); // sets the buildings' runtime context (period)
    return {
      hussar: stable.queueUnit('hussar'),
      cavalry: stable.queueUnit('cavalry'),
      soldier: barracks.queueUnit('soldier'),
    };
  });

  expect(res.hussar).toBe(false); // horses arrive with the Viceroyalty (1532+)
  expect(res.cavalry).toBe(false);
  expect(res.soldier).toBe(true);
});
