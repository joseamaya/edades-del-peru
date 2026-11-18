import { test, expect, type Page } from '@playwright/test';

async function startMission(page: Page): Promise<void> {
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  await start.waitFor({ state: 'visible', timeout: 30_000 });
  await start.click();
  await page
    .locator('.ed-overlay')
    .filter({ hasText: 'COMENZAR MISIÓN' })
    .waitFor({ state: 'detached', timeout: 15_000 })
    .catch(() => {});
}

/** Real Felipe 1824–1826: the battery network is built with ordinary place/build orders. */
test('m_real_felipe builds two batteries with real commands', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m_real_felipe&seed=777&fog=0&low=1&noloop=1&intro=0');
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

    const placeBattery = (x: number, z: number): void => {
      const spot = g.findFreeSpot(x, z, 2);
      if (!spot || !g.executeCommand({ kind: 'place', building: 'fortress', x: spot.x, z: spot.z }, false)) {
        placed.push(false);
        accepted.push(false);
        return;
      }
      const battery = [...g.buildings.values()].find(
        (b: any) =>
          b.owner === 0 &&
          b.kind === 'fortress' &&
          !b.dead &&
          Math.abs(b.pos.x - spot.x) < 0.01 &&
          Math.abs(b.pos.z - spot.z) < 0.01,
      ) as any;
      if (!battery) {
        placed.push(false);
        accepted.push(false);
        return;
      }
      placed.push(true);
      accepted.push(
        Boolean(
          g.executeCommand(
            { kind: 'order', unitIds: workerIds, order: { kind: 'build', entityId: battery.id }, clear: true },
            false,
          ),
        ),
      );
      const dt = 1 / 60;
      let t = 0;
      for (let i = 0; i < Math.ceil(90 / dt); i++) {
        g.update(dt, t);
        t += dt;
      }
    };

    placeBattery(0.46 * 256, 0.56 * 256);
    placeBattery(0.55 * 256, 0.48 * 256);

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
      batteries: g.mission.getObjectiveState('a1_baterias') as string,
      bloqueo: g.mission.getObjectiveState('a2_bloqueo') as string,
      forts: [...g.buildings.values()]
        .filter((b: any) => b.owner === 0 && b.kind === 'fortress' && !b.dead)
        .map((b: any) => ({
          x: Math.round(b.pos.x),
          z: Math.round(b.pos.z),
          done: b.constructionComplete,
          progress: Math.round((b.buildProgress ?? 0) * 100),
        })),
    };
  });

  expect(out.workers, 'the mission starts without workers').toBeGreaterThan(0);
  expect(out.placed, 'a battery could not be placed').toEqual([true, true]);
  expect(out.accepted, 'the build order was rejected').toEqual([true, true]);
  expect(out.batteries, 'the two batteries did not complete the network').toBe('completed');
  expect(out.bloqueo, 'the blockade did not open after the batteries').toBe('activo');
  expect(errors).toEqual([]);
});
