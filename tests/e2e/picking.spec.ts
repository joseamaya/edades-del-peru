import { test, expect } from '@playwright/test';

/**
 * Picking raycasts one invisible proxy box per unit/building (non-recursive).
 * These assert that the resolved entity is still the one under the cursor, and
 * that empty space stays empty.
 */
test('picking resolves units and buildings from their proxies', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1');
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

  const res = await page.evaluate(() => {
    const w = window as unknown as { game: any; THREE: any; innerWidth: number; innerHeight: number };
    const g = w.game;
    g.loop.stop();
    const project = (x: number, y: number, z: number) => {
      const v = new w.THREE.Vector3(x, y, z).project(g.camera.camera);
      return { sx: (v.x * 0.5 + 0.5) * w.innerWidth, sy: (-v.y * 0.5 + 0.5) * w.innerHeight };
    };
    const aim = (x: number, z: number) => {
      g.camera.moveTo(x, z, true);
      g.camera.update(0, performance.now() / 1000);
      g.camera.camera.updateMatrixWorld(true);
    };

    const unit = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead);
    aim(unit.pos.x, unit.pos.z);
    const up = project(unit.pos.x, unit.pos.y + 0.4, unit.pos.z);
    const pickedUnit = g.pickAt(up.sx, up.sy).unit?.id ?? null;
    const skyP = project(unit.pos.x, 500, unit.pos.z);
    const sky = g.pickAt(skyP.sx, skyP.sy);

    const building = g.spawnScriptedBuilding('house', 0, unit.pos.x + 16, unit.pos.z + 16);
    aim(building.pos.x, building.pos.z);
    const bp = project(building.pos.x, building.pos.y + building.stats.size * 0.5, building.pos.z);
    const pickedBuilding = g.pickAt(bp.sx, bp.sy).building?.id ?? null;

    return {
      unitId: unit.id as number,
      pickedUnit,
      buildingId: building.id as number,
      pickedBuilding,
      emptySky: sky.unit == null && sky.building == null,
      proxyIsMesh: unit.view.pickProxy?.isMesh === true,
      proxyInvisible: unit.view.pickProxy?.visible === false,
    };
  });

  expect(res.proxyIsMesh).toBe(true);
  expect(res.proxyInvisible).toBe(true);
  expect(res.pickedUnit).toBe(res.unitId);
  expect(res.pickedBuilding).toBe(res.buildingId);
  expect(res.emptySky).toBe(true);
});
