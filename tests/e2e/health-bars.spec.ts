import { test, expect } from '@playwright/test';

test('damaged units show a health bar; full-health units do not', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const c = g.playerCenter(0);
    const ally = g.spawnScriptedUnit('soldier', 0, c.x + 3, c.z);
    const enemy = g.spawnScriptedUnit('soldier', 1, c.x + 12, c.z);
    ally.clearOrders();
    enemy.clearOrders();
    enemy.combatStance = 'pasivo';
    enemy.hp = enemy.maxHp * 0.4;
    let t = 0;
    for (let i = 0; i < 3; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return { allyBar: !!ally.view.healthBar?.visible, enemyBar: !!enemy.view.healthBar?.visible };
  });
  expect(out.enemyBar).toBe(true);
  expect(out.allyBar).toBe(false);
});
