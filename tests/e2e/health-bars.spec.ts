import { test, expect } from '@playwright/test';

test('damaged units show a health bar above the model, facing the camera', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const T = (window as unknown as { THREE: any }).THREE;
    g.loop.stop();
    g.paused = false;
    const c = g.playerCenter(0);
    const ally = g.spawnScriptedUnit('soldier', 0, c.x + 3, c.z);
    const enemy = g.spawnScriptedUnit('soldier', 1, c.x + 12, c.z);
    ally.clearOrders();
    enemy.clearOrders();
    enemy.combatStance = 'pasivo';
    enemy.hp = enemy.maxHp * 0.4;
    enemy.yaw = 1.0; // rotate the unit so billboarding has to compensate
    let t = 0;
    for (let i = 0; i < 3; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const bar = enemy.view.healthBar;
    const world = new T.Quaternion();
    bar.getWorldQuaternion(world);
    return {
      enemyBar: !!bar?.visible,
      allyBar: !!ally.view.healthBar?.visible,
      barLift: bar.children[0].position.y,
      cameraAlign: Math.abs(world.dot(g.camera.camera.quaternion)),
    };
  });
  expect(out.enemyBar).toBe(true);
  expect(out.allyBar).toBe(false);
  // above the model (not buried in the torso)
  expect(out.barLift).toBeGreaterThan(1.5);
  // billboarded: the bar's world orientation matches the camera
  expect(out.cameraAlign).toBeGreaterThan(0.99);
});
