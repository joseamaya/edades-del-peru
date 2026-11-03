import { test, expect, type Page } from '@playwright/test';

async function boot(page: Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.ais.length = 0;
  });
}

test('market cards trade resources', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const marketId = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    const market = g.spawnScriptedBuilding('market', 0, center.pos.x + 8, center.pos.z + 8);
    g.players[0].resources.silver = 500;
    g.selectBuilding(market.id);
    g.hud.renderBottom();
    return market.id as number;
  });
  await expect(page.locator('#ed-bottom')).toContainText('Comprar Comida');
  const result = await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    const before = { food: g.players[0].resources.food, silver: g.players[0].resources.silver };
    const quote = g.marketQuote(0, 'food', 'buy');
    g.executeCommand({ kind: 'market', action: 'buy', resource: 'food', amount: 100 });
    const after = { food: g.players[0].resources.food, silver: g.players[0].resources.silver };
    return { id, before, after, quote };
  }, marketId);
  expect(result.after.food).toBe(result.before.food + 100);
  expect(result.after.silver).toBe(result.before.silver - result.quote.silver);
});

test('a caravan earns silver on a longer route', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    const a = g.spawnScriptedBuilding('market', 0, center.pos.x + 8, center.pos.z);
    const b = g.spawnScriptedBuilding('market', 0, center.pos.x + 38, center.pos.z);
    const caravan = g.spawnScriptedUnit('caravan', 0, a.pos.x, a.pos.z);
    g.players[0].resources.silver = 0;
    g.executeCommand({
      kind: 'order',
      unitIds: [caravan.id],
      order: { kind: 'trade', entityId: b.id, origin: { x: a.pos.x, z: a.pos.z } },
      clear: true,
    });
    let t = 0;
    for (let i = 0; i < 60 * 40; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return { silver: g.players[0].resources.silver, caravanDead: caravan.dead };
  });
  expect(out.caravanDead).toBe(false);
  expect(out.silver).toBeGreaterThan(0);
});

test('replanting a farm persists through save and load', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const farmId = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    const farm = g.spawnScriptedBuilding('farm', 0, center.pos.x - 10, center.pos.z + 6);
    farm.foodAmount = 0;
    g.players[0].resources.wood = 200;
    const ok = g.executeCommand({ kind: 'replant', buildingId: farm.id });
    g.saveMatch();
    return { id: farm.id as number, ok, food: farm.foodAmount };
  });
  expect(farmId.ok).toBe(true);
  expect(farmId.food).toBeGreaterThan(0);
  await page.goto('/?load=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const restored = await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return g.buildings.get(id)?.foodAmount ?? -1;
  }, farmId.id);
  expect(restored).toBeGreaterThan(0);
});
