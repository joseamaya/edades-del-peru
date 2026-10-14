import { test, expect } from '@playwright/test';

interface ModsGlobal {
  loaded: string[];
  errors: string[];
}

test('a valid mod is loaded at boot and patches the data', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1&mod=example');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const mods = await page.evaluate(() => (window as unknown as { __mods: ModsGlobal }).__mods);
  expect(mods.loaded).toContain('example');
  expect(mods.errors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('a missing mod is skipped without breaking boot', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1&mod=does_not_exist');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const mods = await page.evaluate(() => (window as unknown as { __mods: ModsGlobal }).__mods);
  expect(mods.loaded).toEqual([]);
  expect(mods.errors.length).toBeGreaterThan(0);
  const hasGame = await page.evaluate(() => (window as unknown as { game?: unknown }).game !== undefined);
  expect(hasGame).toBe(true);
});

test('a mod actually changes a stat in the browser', async ({ page }) => {
  const soldierHp = async (url: string): Promise<number> => {
    await page.goto(url);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    return page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      // player 1 (the AI) shares the same civ in both runs, so only the mod differs
      return g.spawnScriptedUnit('soldier', 1, 12, 12).stats.hp as number;
    });
  };
  const base = await soldierHp('/?play=1&seed=777&fog=0&low=1&noloop=1');
  const modded = await soldierHp('/?play=1&seed=777&fog=0&low=1&noloop=1&mod=example');
  expect(modded).toBeGreaterThan(base);
});
