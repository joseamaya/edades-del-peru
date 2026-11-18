import { test, expect } from '@playwright/test';
import { startMission } from './mission-start';

/** La Breña 1882–1883: the community network is built with ordinary place/build orders. */
test('m_brena builds the community network with real commands', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m_brena&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await startMission(page);

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any[];
    const workerIds = workers.map((w) => w.id);
    const placed: boolean[] = [];
    const accepted: boolean[] = [];

    const placeCommunity = (x: number, z: number): void => {
      const spot = g.findFreeSpot(x, z, 2);
      if (!spot || !g.executeCommand({ kind: 'place', building: 'house', x: spot.x, z: spot.z }, false)) {
        placed.push(false);
        accepted.push(false);
        return;
      }
      const house = [...g.buildings.values()].find(
        (b: any) =>
          b.owner === 0 &&
          b.kind === 'house' &&
          !b.dead &&
          Math.abs(b.pos.x - spot.x) < 0.01 &&
          Math.abs(b.pos.z - spot.z) < 0.01,
      ) as any;
      if (!house) {
        placed.push(false);
        accepted.push(false);
        return;
      }
      placed.push(true);
      accepted.push(
        Boolean(
          g.executeCommand(
            { kind: 'order', unitIds: workerIds, order: { kind: 'build', entityId: house.id }, clear: true },
            false,
          ),
        ),
      );
      const dt = 1 / 60;
      let t = 0;
      for (let i = 0; i < Math.ceil(50 / dt); i++) {
        g.update(dt, t);
        t += dt;
      }
    };

    placeCommunity(0.28 * 256, 0.46 * 256);
    placeCommunity(0.46 * 256, 0.54 * 256);
    placeCommunity(0.58 * 256, 0.42 * 256);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(5 / dt); i++) {
      g.update(dt, t);
      t += dt;
    }

    return {
      workers: workers.length,
      placed,
      accepted,
      comunidades: g.mission.getObjectiveState('a1_comunidades') as string,
      galgas: g.mission.getObjectiveState('a2_galgas') as string,
    };
  });

  expect(out.workers).toBeGreaterThan(0);
  expect(out.placed, 'a community could not be placed').toEqual([true, true, true]);
  expect(out.accepted, 'a build order was rejected').toEqual([true, true, true]);
  expect(out.comunidades, 'the community network did not complete').toBe('completed');
  expect(out.galgas, 'the ambush did not open after the network').toBe('activo');
  expect(errors).toEqual([]);
});
