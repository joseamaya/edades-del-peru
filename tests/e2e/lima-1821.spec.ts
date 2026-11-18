import { test, expect } from '@playwright/test';
import { startMission } from './mission-start';

/** Lima 1821: the first act is completed by moving the montoneras, not by calling objectives. */
test('m_lima_1821 cuts the Lurín road with real move orders', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m_lima_1821&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await startMission(page);

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();

    const montoneras = [...g.units.values()].filter(
      (u: any) => u.owner === 0 && u.kind === 'patriota_montonera' && !u.dead,
    ) as any[];
    const target = { x: 154, z: 206 };
    for (const unit of montoneras) {
      g.executeCommand({ kind: 'order', unitIds: [unit.id], order: { kind: 'move', target }, clear: true }, false);
    }

    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(100 / dt) && !g.mission.ended; i++) {
      g.update(dt, t);
      t += dt;
    }

    return {
      montoneras: montoneras.length,
      cortar: g.mission.getObjectiveState('a1_cortar') as string,
      lima: g.mission.getObjectiveState('a1_lima') as string,
      ended: g.mission.ended as boolean,
    };
  });

  expect(out.montoneras, 'the mission starts without montoneras').toBeGreaterThanOrEqual(3);
  expect(out.cortar, 'the montoneras did not cut the road after a real move order').toBe('completed');
  expect(out.lima, 'the next act did not open after cutting the road').toBe('activo');
  expect(out.ended).toBe(false);
  expect(errors).toEqual([]);
});
