import { test, expect, Page } from '@playwright/test';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

function settlementSig(page: Page) {
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const overlays = g.settlements ?? [];
    let meshes = 0;
    for (const o of overlays) o.group.traverse((m: any) => (m.isMesh ? (meshes += 1) : null));
    const plan = overlays[0]?.plan ?? null;
    return {
      count: overlays.length,
      meshes,
      dwellings: plan ? plan.dwellings.length : 0,
      fields: plan ? plan.fields.map((f: any) => ({ x: f.x, z: f.z })) : [],
      roads: plan ? plan.roads.length : 0,
    };
  });
}

test('a starting base carries its planned fields and roads', async ({ page }) => {
  await boot(page, '/?civ=moche&period=2&seed=777&fog=0&low=1&noloop=1');
  const s = await settlementSig(page);
  expect(s.count).toBeGreaterThan(0);
  expect(s.meshes).toBeGreaterThan(0);
  expect(s.fields.length).toBeGreaterThan(0);
  // a road to every dwelling (and then some fields)
  expect(s.roads).toBeGreaterThanOrEqual(s.dwellings);
});

test('the settlement fields and roads sit on buildable, dry, gentle ground', async ({ page }) => {
  await boot(page, '/?civ=inca&period=5&seed=777&fog=0&low=1&noloop=1');
  const bad = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const plan = g.settlements?.[0]?.plan;
    if (!plan) return -1;
    const points = [...plan.fields, ...plan.roads.map((r: any) => r.to)];
    return points.filter(
      (p: any) =>
        g.terrain.isWater(p.x, p.z) || !g.terrain.isBuildable(p.x, p.z) || g.terrain.getSlope(p.x, p.z) > 0.35,
    ).length;
  });
  expect(bad).toBe(0);
});

test('the settlement layout is deterministic for the same seed', async ({ page }) => {
  const sample = async () => {
    await boot(page, '/?civ=moche&period=2&seed=777&fog=0&low=1&noloop=1');
    return settlementSig(page);
  };
  const a = await sample();
  const b = await sample();
  expect(b.fields).toEqual(a.fields);
  expect(b.roads).toBe(a.roads);
});

test('the settlement overlay is regenerated on load', async ({ page }) => {
  await boot(page, '/?play=1&seed=777&fog=0&low=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && g.units.size > 0 && g.buildings.size > 0;
    },
    null,
    { timeout: 15_000 },
  );
  await page.evaluate(() => (window as unknown as { game: any }).game.saveMatch());
  await boot(page, '/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && g.buildings.size > 0;
    },
    null,
    { timeout: 15_000 },
  );
  const s = await settlementSig(page);
  expect(s.count).toBeGreaterThan(0);
  expect(s.fields.length).toBeGreaterThan(0);
});

test('starting units deploy outside the civic core and its houses', async ({ page }) => {
  await boot(page, '/?mission=m1_caral&seed=3000&fog=0&low=1&noloop=1&intro=0');
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const units = [...g.units.values()].filter(
      (u: any) => u.owner === 0 && (u.kind === 'worker' || u.kind === 'scout'),
    );
    const buildings = [...g.buildings.values()].filter((b: any) => b.owner === 0 && !b.dead);
    let clearance = Infinity;
    for (const u of units) {
      for (const b of buildings)
        clearance = Math.min(clearance, Math.hypot(u.pos.x - b.pos.x, u.pos.z - b.pos.z) - b.radius);
    }
    let pair = Infinity;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        pair = Math.min(pair, Math.hypot(units[i].pos.x - units[j].pos.x, units[i].pos.z - units[j].pos.z));
      }
    }
    g.camera.update(1, 0);
    g.camera.camera.updateMatrixWorld(true);
    const inView = units.every((u: any) => {
      const p = new window.THREE.Vector3(u.pos.x, u.pos.y + 1, u.pos.z).project(g.camera.camera);
      return Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && p.z < 1;
    });
    return { units: units.length, clearance, pair, inView };
  });
  expect(state.units).toBe(5);
  expect(state.clearance).toBeGreaterThan(0.5);
  expect(state.pair).toBeGreaterThan(0.9);
  expect(state.inView).toBe(true);
});

test('initial workers start on the ground at their own position', async ({ page }) => {
  // irregular (high-Andes) terrain makes a mismatched height sample obvious
  await boot(page, '/?civ=inca&period=5&seed=777&fog=0&low=1&noloop=1');
  const worst = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    let worst = 0;
    let checked = 0;
    for (const u of g.units.values()) {
      if (u.owner !== 0 || u.kind !== 'worker') continue;
      checked++;
      worst = Math.max(worst, Math.abs(u.pos.y - g.terrain.getHeight(u.pos.x, u.pos.z)));
    }
    return { worst, checked };
  });
  expect(worst.checked, 'player 0 has starting workers').toBeGreaterThan(0);
  expect(worst.worst).toBeLessThan(0.01);
});
