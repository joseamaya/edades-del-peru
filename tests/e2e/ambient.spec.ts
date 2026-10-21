import { test, expect } from '@playwright/test';

test('ambient props and fauna are placed at boot', async ({ page }) => {
  await page.goto('/?civ=inca&period=5&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const meshes = [...g.props.meshes.values()] as { count: number }[];
    const fauna = g.wildlife.animals as {
      group: { name: string; children: unknown[] };
      rig: unknown | null;
      legs: { rotation: { x: number; z: number } }[];
      wings: { pivot: { rotation: { x: number; z: number } } }[];
    }[];
    const rigged = fauna.filter((a) => a.rig);
    const procedural = fauna.filter((a) => !a.rig);
    const sample = procedural.find((a) => a.legs.length) ?? procedural.find((a) => a.wings.length);
    let limbMoved = false;
    if (sample) {
      const limb = sample.legs[0] ?? sample.wings[0].pivot;
      const before = limb.rotation.x + limb.rotation.z;
      g.wildlife.update(0.4);
      g.wildlife.update(0.4);
      limbMoved = Math.abs(limb.rotation.x + limb.rotation.z - before) > 1e-4;
    }
    return {
      propKinds: meshes.length,
      instances: meshes.reduce((n, m) => n + m.count, 0),
      fauna: fauna.length,
      rigged: rigged.length,
      articulated: procedural.every((a) => a.group.children.length > 1),
      speciesOk: procedural.every((a) =>
        /llama|vicuna/.test(a.group.name) ? a.legs.length === 4 : a.wings.length === 2,
      ),
      limbMoved,
    };
  });
  expect(out.propKinds).toBe(4);
  expect(out.instances).toBeGreaterThan(0);
  expect(out.fauna).toBeGreaterThan(0);
  expect(out.rigged).toBeGreaterThan(0); // llama pilot
  expect(out.articulated).toBe(true); // procedural body + animated limbs/wings
  expect(out.speciesOk).toBe(true); // procedural quadrupeds 4 legs, birds 2 wings
  expect(out.limbMoved).toBe(true); // the procedural gait/flap actually animates
});

test('buildings grow while under construction', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const b = [...g.buildings.values()].find((x: any) => x.owner === 0 && x.kind === 'center');
    b.beginConstruction();
    b.addBuildProgress(1);
    b.update(1 / 60, 0);
    const growing = b.view.group.scale.y;
    b.addBuildProgress(9999);
    b.update(1 / 60, 0);
    return { growing, complete: b.view.group.scale.y };
  });
  expect(out.growing).toBeLessThan(0.5);
  expect(out.complete).toBe(1);
});
