import { test, expect } from '@playwright/test';

async function waitReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && g.units.size > 0 && g.buildings.size > 0;
    },
    null,
    { timeout: 15_000 },
  );
}

test('saves and loads a skirmish match', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1');
  await waitReady(page);

  // mutate the match so the round trip is meaningful, then save
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const worker = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    const node = [...g.resourceNodes.values()][0];
    worker.pos.set(worker.pos.x + 3, worker.pos.y, worker.pos.z + 2);
    worker.issueOrder({ kind: 'gather', entityId: node.id }, true);
    g.players[0].resources.food = 777;
    g.players[0].era = 2;
    g.players[0].bonus.attack = 0.5;
    g.players[0].bonus.gathering.food = 0.3;
    g.saveMatch();
    return {
      units: g.units.size,
      buildings: g.buildings.size,
      nodes: g.resourceNodes.size,
      food: g.players[0].resources.food,
      era: g.players[0].era,
      bonusAttack: g.players[0].bonus.attack,
      bonusFood: g.players[0].bonus.gathering.food,
      unitId: worker.id as number,
      nodeId: node.id as number,
      ux: worker.pos.x,
      uz: worker.pos.z,
      hasSave: localStorage.getItem('peru-save') !== null,
    };
  });
  expect(before.hasSave).toBe(true);

  await page.goto('/?load=1');
  await waitReady(page);
  const after = await page.evaluate(
    (ids) => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      const u = g.units.get(ids.unitId);
      return {
        units: g.units.size,
        buildings: g.buildings.size,
        nodes: g.resourceNodes.size,
        food: g.players[0].resources.food,
        era: g.players[0].era,
        bonusAttack: g.players[0].bonus.attack,
        bonusFood: g.players[0].bonus.gathering.food,
        ux: u?.pos.x ?? null,
        uz: u?.pos.z ?? null,
        orderKind: u?.orderQueue[0]?.kind ?? null,
        orderEntity: u?.orderQueue[0]?.entityId ?? null,
      };
    },
    { unitId: before.unitId },
  );

  expect(after.units).toBe(before.units);
  expect(after.buildings).toBe(before.buildings);
  expect(after.nodes).toBe(before.nodes);
  expect(after.food).toBe(before.food);
  expect(after.era).toBe(before.era);
  // researched bonuses survive (so units trained after load keep upgrades)
  expect(after.bonusAttack).toBe(before.bonusAttack);
  expect(after.bonusFood).toBe(before.bonusFood);
  // the unit and its order (referencing a resource node id) survive the round trip
  expect(after.orderKind).toBe('gather');
  expect(after.orderEntity).toBe(before.nodeId);
  // positions are restored (small drift is possible if the loop ticked before we stopped it)
  expect(after.ux).not.toBeNull();
  expect(Math.abs((after.ux as number) - before.ux)).toBeLessThan(2);
  expect(Math.abs((after.uz as number) - before.uz)).toBeLessThan(2);
});

test('loading without a save shows the main menu', async ({ page }) => {
  await page.goto('/?load=1&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const menu = page.locator('.ed-overlay', { hasText: 'EDADES DEL PERÚ' });
  await expect(menu).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /Escaramuza/ })).toBeVisible();
});
