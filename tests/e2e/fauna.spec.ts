import { test, expect, type Page } from '@playwright/test';

interface WildlifeEntry {
  species: string;
  rigged: boolean;
  state: string | null;
  x: number;
  y: number;
  z: number;
}

interface AssetStatus {
  id: string;
  state: string;
  refs: number;
}

async function step(page: Page, steps: number): Promise<void> {
  await page.evaluate((count) => {
    const g = (window as unknown as { game: any }).game;
    let time = 0;
    for (let i = 0; i < count; i++) {
      time += 1 / 60;
      g.loop.onUpdate(1 / 60, time);
    }
  }, steps);
}

test('the llama pilot uses the rigged camelid and keeps the procedural fallback', async ({ page }) => {
  const errors: string[] = [];
  const modelWarnings: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning' && msg.text().includes('[models]')) modelWarnings.push(msg.text());
  });

  await page.goto('/?play=1&seed=777&map=altiplano&low=1&fog=0&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const initial = await page.evaluate(() => {
    const w = window as unknown as { __modelAssets: () => AssetStatus[]; game: any };
    return {
      assets: w.__modelAssets(),
      fauna: w.game.wildlife.debugSnapshot() as WildlifeEntry[],
      region: w.game.mapProfile.region as string,
    };
  });
  expect(initial.region).toBe('altiplano');
  expect(initial.assets.find((asset) => asset.id === 'quaternius_alpaca')?.state).toBe('ready');
  expect(initial.fauna.length).toBeGreaterThan(0);
  expect(initial.fauna.length).toBeLessThanOrEqual(16);

  await step(page, 240);

  const observed = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const fauna = g.wildlife.debugSnapshot() as WildlifeEntry[];
    return {
      fauna,
      terrain: fauna.filter((a) => a.rigged).map((a) => ({ y: a.y, ground: g.terrain.getHeight(a.x, a.z) as number })),
    };
  });
  const llamas = observed.fauna.filter((a) => a.species === 'llama');
  expect(llamas.some((a) => a.rigged)).toBe(true);
  expect(observed.fauna.some((a) => a.species === 'vicuna' && !a.rigged)).toBe(true);
  expect(llamas.some((a) => a.state === 'walk' || a.state === 'eat')).toBe(true);
  for (const sample of observed.terrain) expect(Math.abs(sample.y - sample.ground)).toBeLessThan(0.02);

  const orientation = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const THREE = (window as unknown as { THREE: any }).THREE;
    let walking: any = null;
    for (let i = 0; i < 240 && !walking; i++) {
      g.wildlife.update(1 / 60);
      walking = g.wildlife.animals.find((a: any) => a.rig?.currentState === 'walk');
    }
    if (!walking) return null;
    const before = walking.group.position.clone();
    g.wildlife.update(1 / 60);
    const velocity = walking.group.position.clone().sub(before);
    if (velocity.lengthSq() < 1e-8) return null;
    const quaternion = new THREE.Quaternion();
    walking.group.getWorldQuaternion(quaternion);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
    return { dot: velocity.normalize().dot(forward.normalize()) };
  });
  expect(orientation).not.toBeNull();
  expect(orientation!.dot).toBeGreaterThan(0.9);

  expect(errors).toEqual([]);
  expect(modelWarnings).toEqual([]);

  await page.evaluate(() => (window as unknown as { game: { destroy: () => void } }).game.destroy());
  const afterDestroy = await page.evaluate(() =>
    (window as unknown as { __modelAssets: () => AssetStatus[] }).__modelAssets(),
  );
  expect(afterDestroy.find((asset) => asset.id === 'quaternius_alpaca')?.state).toBe('idle');
});

test('hunt nodes start as a walking herd and become stylised carcasses', async ({ page }) => {
  await page.goto('/?play=1&seed=777&map=altiplano&low=1&fog=0&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const node = [...g.resourceNodes.values()].find((n: any) => n.kind === 'hunt');
    if (!node) return null;
    const herd = node.view.getObjectByName('hunt_herd');
    if (!herd) return null;
    const body = herd.getObjectByName('hunt_bodies');
    const legs = herd.getObjectByName('hunt_legs');
    const carcasses = herd.getObjectByName('hunt_carcasses');
    if (!body || !legs || !carcasses) return null;
    const before = Array.from(body.instanceMatrix.array.slice(12, 15));
    node.update(1.5);
    const after = Array.from(body.instanceMatrix.array.slice(12, 15));
    const liveAtStart = body.count;
    const legsAtStart = legs.count;

    node.subtract(node.maxAmount * 0.5);
    const afterHalf = { live: body.count, carcasses: carcasses.count, legs: legs.count };

    node.subtract(node.maxAmount * 0.4);
    const afterMost = { live: body.count, carcasses: carcasses.count };

    node.subtract(node.maxAmount);
    const depleted = { live: body.count, carcasses: carcasses.count, rotation: node.view.rotation.x };

    return { before, after, liveAtStart, legsAtStart, afterHalf, afterMost, depleted };
  });

  expect(state).not.toBeNull();
  expect(state!.before).not.toEqual(state!.after);
  expect(state!.liveAtStart).toBe(3);
  expect(state!.legsAtStart).toBe(12);
  expect(state!.afterHalf).toEqual({ live: 2, carcasses: 1, legs: 8 });
  expect(state!.afterMost).toEqual({ live: 1, carcasses: 2 });
  expect(state!.depleted).toEqual({ live: 0, carcasses: 3, rotation: 0 });
});
