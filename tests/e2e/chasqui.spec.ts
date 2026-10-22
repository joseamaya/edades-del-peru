import { expect, test, type Page } from '@playwright/test';

const URL = '/?play=1&civ=caral&period=0&map=altiplano&seed=777&fog=0&low=1&noloop=1';

async function boot(page: Page): Promise<void> {
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the Caral chasqui uses the rigged runner outfit and walk clip', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page);
  const initial = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const scout = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'scout');
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    if (!scout || !worker) return { ok: false, reason: 'missing opening units' };
    const visible = (unit: any, name: string): boolean => {
      const mesh = unit.rig?.root.getObjectByName(name);
      return !!mesh && mesh.visible;
    };
    return {
      ok: true,
      scoutRig: !!scout.rig,
      workerRig: !!worker.rig,
      scout: {
        longTunic: visible(scout, 'attire_tunic'),
        skirt: visible(scout, 'attire_skirt'),
        chasquiSkirt: visible(scout, 'attire_skirt_chasqui'),
        belt: visible(scout, 'attire_belt_chasqui'),
        tool: visible(scout, 'attire_tool'),
        canteen: visible(scout, 'attire_canteen'),
      },
      worker: {
        longTunic: visible(worker, 'attire_tunic'),
        skirt: visible(worker, 'attire_skirt'),
        chasquiSkirt: visible(worker, 'attire_skirt_chasqui'),
        belt: visible(worker, 'attire_belt_chasqui'),
        tool: visible(worker, 'attire_tool'),
      },
    };
  });
  expect(initial.ok, initial.reason).toBe(true);
  expect(initial.scoutRig).toBe(true);
  expect(initial.workerRig).toBe(true);
  expect(initial.scout).toEqual({
    longTunic: true,
    skirt: false,
    chasquiSkirt: true,
    belt: true,
    tool: false,
    canteen: true,
  });
  expect(initial.worker).toEqual({
    longTunic: true,
    skirt: true,
    chasquiSkirt: false,
    belt: false,
    tool: true,
  });

  const running = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const scout = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'scout');
    let time = 0;
    scout.clearOrders();
    scout.issueOrder({ kind: 'move', target: { x: scout.pos.x + 5, z: scout.pos.z } }, true);
    for (let i = 0; i < 45; i++) {
      time += 1 / 60;
      g.loop.onUpdate(1 / 60, time);
    }
    return { state: scout.rig?.currentState ?? null, clip: scout.rig?.currentClipName ?? null };
  });
  expect(running).toEqual({ state: 'walk', clip: 'Walk_Loop' });
  expect(errors).toEqual([]);
});
