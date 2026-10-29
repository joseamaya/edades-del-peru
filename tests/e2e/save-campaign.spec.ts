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

  // continuing must not reload the snapshot (`?load=1`) instead of the next mission
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.settings.missionId = 'm2_chavin';
    g.resetGame();
  });
  await page.waitForURL(/mission=m2_chavin/, { timeout: 30_000 });
  expect(new URL(page.url()).searchParams.has('load')).toBe(false);
});

test('saves and loads the Chavín delivered offerings', async ({ page }) => {
  await page.goto('/?mission=m2_chavin&seed=900&fog=0&low=1');
  await startMission(page);
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const anchor = g.siteAnchor as { x: number; z: number };
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    for (let i = 0; i < 5; i++) g.makeOffering('chavin_edificio_b');
    g.update(1 / 60, 0);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(10 / dt); i++) {
      worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
      g.update(dt, t);
      t += dt;
    }
    g.saveMatch();
    return {
      progress: g.mission.getObjectiveProgress('obj_ofrendas'),
      pilgrimage: g.mission.getObjectiveProgress('obj_peregrinaje'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
      silver: g.players[0].resources.silver,
    };
  });
  expect(before.progress.current).toBe(250);
  expect(before.pilgrimage?.current).toBeGreaterThan(0);
  expect(before.tutorialStep).not.toBeNull();
  expect(before.silver).toBe(50);

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g?.mission && g.units.size > 0;
    },
    null,
    { timeout: 20_000 },
  );
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return {
      progress: g.mission.getObjectiveProgress('obj_ofrendas'),
      pilgrimage: g.mission.getObjectiveProgress('obj_peregrinaje'),
      tutorialStep: g.tutorial?.toSave().stepId ?? null,
      silver: g.players[0].resources.silver,
    };
  });
  expect(after.progress).toEqual(before.progress);
  expect(after.pilgrimage).toEqual(before.pilgrimage);
  expect(after.tutorialStep).toBe(before.tutorialStep);
  expect(after.silver).toBe(before.silver);
});
