import { test, expect } from '@playwright/test';

/** Boot a skirmish and stop the loop so tests drive damage deterministically. */
async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
  });
}

test('the attack type selects the defender armor (light vs heavy)', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.playerCenter(1);
    const hussar = g.spawnScriptedUnit('hussar', 1, c.x, c.z); // lightArmor 1, heavyArmor 0
    hussar.clearOrders();
    hussar.combatStance = 'pasivo';
    const startHp = hussar.hp;
    g.resolveDamage(0, hussar.id, 10, { owner: 0 }, 'light');
    const lightLoss = startHp - hussar.hp;
    hussar.hp = startHp;
    g.resolveDamage(0, hussar.id, 10, { owner: 0 }, 'heavy');
    const heavyLoss = startHp - hussar.hp;
    return { lightLoss, heavyLoss, lightArmor: hussar.stats.lightArmor, heavyArmor: hussar.stats.heavyArmor };
  });
  expect(out.lightArmor).toBe(1);
  expect(out.heavyArmor).toBe(0);
  // light armor absorbs the light attack; the heavy attack bypasses it
  expect(out.lightLoss).toBeCloseTo(9, 5);
  expect(out.heavyLoss).toBeCloseTo(10, 5);
  expect(out.heavyLoss).toBeGreaterThan(out.lightLoss);
});

test('the civilization armor bonus reduces incoming damage', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.playerCenter(0);
    const soldier = g.spawnScriptedUnit('soldier', 0, c.x, c.z);
    soldier.clearOrders();
    soldier.combatStance = 'pasivo';
    const startHp = soldier.hp;
    g.resolveDamage(1, soldier.id, 10, { owner: 1 }, 'heavy');
    const plainLoss = startHp - soldier.hp;
    soldier.hp = startHp;
    soldier.armorMultiplier = 1.1; // +10% armor
    g.resolveDamage(1, soldier.id, 10, { owner: 1 }, 'heavy');
    const armoredLoss = startHp - soldier.hp;
    return { plainLoss, armoredLoss };
  });
  expect(out.plainLoss).toBeCloseTo(10, 5);
  expect(out.armoredLoss).toBeCloseTo(9, 5);
});
