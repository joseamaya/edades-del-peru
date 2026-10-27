import { test, expect } from '@playwright/test';

/**
 * Models are built once per signature and cloned per instance, sharing geometry
 * but not materials. These assert that mutating one entity's materials (fade while
 * building, placement ghost tint) never leaks into another entity of the same kind.
 */
test('model materials are per instance and do not leak between entities', async ({ page }) => {
  await page.goto('/?play=1&civ=realistas&period=6&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);

  const res = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const mats = (group: any): any[] => {
      const out: any[] = [];
      group.traverse((o: any) => {
        if (o.isMesh && o.visible) out.push(o.material);
      });
      return out;
    };

    const workers = [...g.units.values()].filter((u: any) => u.kind === 'worker' && u.owner === 0);
    const shared = workers.length >= 2 && mats(workers[0].view.group)[0] === mats(workers[1].view.group)[0];

    // the carry bundle tints per resource, so its material must not use baked vertex colours
    let carryPivot: any = null;
    workers[0].view.group.traverse((o: any) => {
      if (o.name === 'pivot:carry') carryPivot = o;
    });
    const carryMesh = carryPivot?.children.find((c: any) => c.isMesh);
    const carryVertexColors = carryMesh ? carryMesh.material.vertexColors : null;

    const center = [...g.buildings.values()].find((b: any) => b.kind === 'center' && b.owner === 0);
    const centerTransparentBefore = mats(center.view.group).filter((m) => m.transparent === true).length;

    // place a house: it begins construction (faded) and must not fade the center
    g.selectedUnits = [workers[0].id];
    g.startPlacement('house');
    const spot = g.findFreeSpot(center.pos.x, center.pos.z, 2);
    g.commitPlacement(spot.x, spot.z);
    const house = [...g.buildings.values()].find((b: any) => b.kind === 'house' && !b.constructionComplete);
    const centerTransparentAfter = mats(center.view.group).filter((m) => m.transparent === true).length;
    const houseFaded = mats(house.view.group).some((m) => m.transparent === true && m.opacity < 1);

    // the placement ghost tint must not leak onto the real house of the same kind
    const houseColorBefore = mats(house.view.group)[0].color.getHex();
    g.startPlacement('house');
    g.updatePlacementGhost(center.pos.x + 5, center.pos.z + 5);
    let ghostColor = 0;
    g.placingBuilding.ghost.traverse((o: any) => {
      if (o.isMesh) ghostColor = o.material.color.getHex();
    });
    const houseColorAfter = mats(house.view.group)[0].color.getHex();

    return {
      shared,
      carryVertexColors,
      centerTransparentBefore,
      centerTransparentAfter,
      houseFaded,
      houseColorBefore,
      houseColorAfter,
      ghostColor,
    };
  });

  expect(res.shared).toBe(false);
  expect(res.carryVertexColors).toBe(false);
  expect(res.centerTransparentAfter).toBe(res.centerTransparentBefore);
  expect(res.houseFaded).toBe(true);
  expect(res.houseColorAfter).toBe(res.houseColorBefore);
  // the ghost got tinted (valid/invalid color), but that tint stayed on the ghost
  expect(res.ghostColor).not.toBe(res.houseColorBefore);
});
