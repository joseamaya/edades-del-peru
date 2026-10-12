import { test, expect } from '@playwright/test';

async function startMission(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  await start.waitFor({ state: 'visible', timeout: 15_000 });
  await start.click();
  await start.waitFor({ state: 'detached', timeout: 15_000 });
}

const capture = () => {
  const g = (window as unknown as { game: any }).game;
  g.loop.stop();
  const objs: Record<string, string> = {};
  for (const o of g.mission.def.objectives) objs[o.id] = g.mission.getObjectiveState(o.id);
  return { units: g.units.size, buildings: g.buildings.size, objs };
};

test('saves and loads a campaign mission', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 15_000 },
  );

  const before = await page.evaluate(capture);
  await page.evaluate(() => (window as unknown as { game: any }).game.saveMatch());

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0 && g.buildings.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(capture);

  expect(after.units).toBe(before.units);
  expect(after.buildings).toBe(before.buildings);
  expect(after.objs).toEqual(before.objs);
  // the briefing must not reappear on load (the mission is already running)
  await expect(page.getByRole('button', { name: /COMENZAR MISIÓN/ })).toHaveCount(0);
});
