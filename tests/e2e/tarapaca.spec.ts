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
      // Cáceres is a protect objective: keep him behind the line instead of parking him in the melee.
      const order = unit.tag === 'caceres' ? { kind: 'move', target: { x: 70, z: 190 } } : { kind: 'move', target };
      g.executeCommand({ kind: 'order', unitIds: [unit.id], order, clear: true }, false);
    }
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(120 / dt) && !g.mission.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      units: units.length,
      workers: units.filter((u) => u.kind === 'worker').length,
      buildings: g.buildings.size,
      pueblo: g.mission.getObjectiveState('a1_pueblo') as string,
      alturas: g.mission.getObjectiveState('a2_alturas') as string,
      ended: g.mission.ended as boolean,
    };
  });

  expect(out.units).toBeGreaterThanOrEqual(6);
  expect(out.workers, 'Tarapacá is a battle, not a settlement').toBe(0);
  expect(out.buildings, 'neither side starts with a generic base').toBe(0);
  expect(out.pueblo, 'the village was not held after real move orders').toBe('completed');
  expect(out.alturas, 'the heights did not open after the hold').toBe('activo');
  expect(out.ended).toBe(false);
  expect(errors).toEqual([]);
});
