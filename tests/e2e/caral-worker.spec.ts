import { test, expect, type Page } from '@playwright/test';
import { CARAL_WORKER_SHADOW_SKIP_MESHES } from '../../src/model/defs/modelAssets';

interface WorkerState {
  state: string | null;
  carry: boolean;
  tool: boolean;
}

async function startCaral(page: Page): Promise<void> {
  await page.goto('/?mission=m1_caral&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByText('COMENZAR MISIÓN').click();
  await page.waitForTimeout(150);
}

test('the Caral worker is rigged, animated by its orders and keeps gameplay intact', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await startCaral(page);
  const shadowSkip = CARAL_WORKER_SHADOW_SKIP_MESHES;

  const initial = await page.evaluate((skipNames) => {
    const g = (window as unknown as { game: any }).game;
    const workers = [...g.units.values()].filter((u: any) => u.kind === 'worker' && u.owner === 0);
    const worker = workers[0];
    const attire = [
      'attire_tunic',
      'attire_skirt',
      'attire_sash',
      'attire_headband',
      'attire_carry',
      'attire_tool',
    ].map((name) => !!worker.rig.root.getObjectByName(name));
    const shadows = (name: string): { cast: boolean; receive: boolean } | null => {
      const mesh = worker.rig.root.getObjectByName(name) as {
        castShadow?: boolean;
        receiveShadow?: boolean;
      } | null;
      return mesh ? { cast: !!mesh.castShadow, receive: !!mesh.receiveShadow } : null;
    };
    return {
      assets: (window as unknown as { __modelAssets: () => any[] }).__modelAssets(),
      workers: workers.length,
      rigged: workers.filter((u: any) => !!u.rig).length,
      attire,
      shadowSkipOk: skipNames.every((name) => {
        const flags = shadows(name);
        return !!flags && !flags.cast && !flags.receive;
      }),
      garmentsShadow: ['attire_tunic', 'attire_skirt', 'attire_sash'].every((name) => {
        const flags = shadows(name);
        return !!flags && flags.cast && flags.receive;
      }),
      hasPickProxy: !!worker.view.pickProxy,
    };
  }, shadowSkip);
  expect(initial.assets.find((asset) => asset.id === 'caral_worker')?.state).toBe('ready');
  expect(initial.workers).toBeGreaterThan(0);
  expect(initial.rigged).toBe(initial.workers);
  expect(initial.attire.every(Boolean)).toBe(true);
  expect(initial.shadowSkipOk).toBe(true);
  expect(initial.garmentsShadow).toBe(true);
  expect(initial.hasPickProxy).toBe(true);

  const simulation = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    let time = 0;
    for (let i = 0; i < 1800; i++) {
      time += 1 / 60;
      g.loop.onUpdate(1 / 60, time);
    }
    const workers = [...g.units.values()].filter((u: any) => u.kind === 'worker' && u.owner === 0);
    return workers.map((u: any) => ({
      state: u.rig?.currentState ?? null,
      carry: !!u.rig?.root.getObjectByName('attire_carry')?.visible,
      tool: !!u.rig?.root.getObjectByName('attire_tool')?.visible,
    })) as WorkerState[];
  });
  expect(simulation.some((worker) => worker.state === 'work')).toBe(true);
  expect(simulation.some((worker) => worker.carry && !worker.tool)).toBe(true);

  const transitions = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const worker = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    let time = 0;
    g.executeCommand({
      kind: 'order',
      unitIds: [worker.id],
      order: { kind: 'move', target: { x: worker.pos.x + 4, z: worker.pos.z } },
      clear: true,
    });
    for (let i = 0; i < 60; i++) {
      time += 1 / 60;
      g.loop.onUpdate(1 / 60, time);
    }
    const walking = worker.rig?.currentState ?? null;
    worker.clearOrders();
    for (let i = 0; i < 90; i++) {
      time += 1 / 60;
      g.loop.onUpdate(1 / 60, time);
    }
    return { walking, idle: worker.rig?.currentState ?? null };
  });
  expect(transitions.walking).toBe('walk');
  expect(transitions.idle).toBe('idle');

  const lifecycle = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const worker = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    g.selectUnits([worker.id]);
    const selected = g.selectedUnits.includes(worker.id);
    const saved = g.saveMatch();
    const workerAsset = () =>
      (window as unknown as { __modelAssets: () => any[] })
        .__modelAssets()
        .find((asset) => asset.id === 'caral_worker');
    const refsBefore = workerAsset().refs;
    const spawned = g.spawnScriptedUnit('worker', 0, worker.pos.x + 3, worker.pos.z + 3);
    const spawnedRigged = !!spawned.rig;
    spawned.removeFromScene();
    const refsAfter = workerAsset().refs;
    return { selected, saved, spawnedRigged, refsBefore, refsAfter };
  });
  expect(lifecycle.selected).toBe(true);
  expect(lifecycle.saved).toBe(true);
  expect(lifecycle.spawnedRigged).toBe(true);
  expect(lifecycle.refsAfter).toBe(lifecycle.refsBefore);

  await page.goto('/?load=1');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && g.units.size > 0;
    },
    null,
    { timeout: 30_000 },
  );
  const restored = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const workers = [...g.units.values()].filter((u: any) => u.kind === 'worker' && u.owner === 0);
    return {
      workers: workers.length,
      rigged: workers.filter((u: any) => !!u.rig).length,
      asset: (window as unknown as { __modelAssets: () => any[] })
        .__modelAssets()
        .find((asset) => asset.id === 'caral_worker')?.state,
    };
  });
  expect(restored.workers).toBeGreaterThan(0);
  expect(restored.rigged).toBe(restored.workers);
  expect(restored.asset).toBe('ready');
  expect(errors).toEqual([]);
});
