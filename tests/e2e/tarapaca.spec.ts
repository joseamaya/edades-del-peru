import { test, expect } from '@playwright/test';
import { startMission } from './mission-start';

/** Tarapacá 1879: the village hold is reached with ordinary move orders. */
test('m_tarapaca holds the village with real move orders', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m_tarapaca&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await startMission(page);

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const units = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead) as any[];
    const target = { x: 96, z: 168 };
    for (const unit of units) {
      g.executeCommand({ kind: 'order', unitIds: [unit.id], order: { kind: 'move', target }, clear: true }, false);
    }
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(50 / dt) && !g.mission.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      units: units.length,
      pueblo: g.mission.getObjectiveState('a1_pueblo') as string,
      alturas: g.mission.getObjectiveState('a2_alturas') as string,
      ended: g.mission.ended as boolean,
    };
  });

  expect(out.units).toBeGreaterThanOrEqual(6);
  expect(out.pueblo, 'the village was not held after real move orders').toBe('completed');
  expect(out.alturas, 'the heights did not open after the hold').toBe('activo');
  expect(out.ended).toBe(false);
  expect(errors).toEqual([]);
});
