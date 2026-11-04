import { test, expect, type Page } from '@playwright/test';

async function boot(page: Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1&civ=caral&period=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('rigged units leave a persistent corpse after the fall', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const unit = [...g.units.values()].find((u: any) => u.owner === 0);
    if (!unit) return { error: 'no player unit' };
    const rig = unit.unitView?.rig;
    unit.takeDamage(9999);
    for (let i = 0; i < 10; i++) g.update(1 / 60, i / 60);
    const afterFall = g.deathFx.length;
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    const afterOneSecond = g.deathFx.length;
    const fx = g.deathFx[0];
    if (fx) fx.t = 30;
    g.update(0.2, 0);
    return {
      rigPresent: !!rig,
      rigFrozen: rig ? rig.currentState === null : false,
      afterFall,
      afterOneSecond,
      afterExpiry: g.deathFx.length,
      removed: !g.units.has(unit.id),
    };
  });
  expect(result).toMatchObject({
    rigPresent: true,
    rigFrozen: true,
    afterFall: 1,
    afterOneSecond: 1,
    afterExpiry: 0,
    removed: true,
  });
});

test('buildings show scorched, then critical damage states', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const building = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    if (!building?.view) return { error: 'no player centre' };
    const view = building.view;
    building.takeDamage(building.maxHp * 0.7);
    g.update(1 / 60, 0);
    const scorchedLean = view.group.rotation.z;
    const scorchedRubble = !!view.group.getObjectByName('damage-rubble');
    building.takeDamage(building.maxHp * 0.2);
    g.update(1 / 60, 0);
    const criticalLean = view.group.rotation.z;
    const criticalRubble = view.group.getObjectByName('damage-rubble')?.visible ?? false;
    return { scorchedLean, scorchedRubble, criticalLean, criticalRubble };
  });
  expect(result).toMatchObject({ scorchedLean: 0, scorchedRubble: false, criticalRubble: true });
  expect((result as { criticalLean: number }).criticalLean).toBeGreaterThan(0);
});
