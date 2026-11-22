import { test, expect } from '@playwright/test';
import { startMission } from './mission-start';

/** Vilcabamba 1572: Huayna Pucará is defended with ordinary move orders. */
test('m_vilcabamba holds Huayna Pucará with real move orders', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m_vilcabamba&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await startMission(page);

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    // The Inca warriors alone lose the exchange with the probing column (their defensive stance keeps
    // them from closing), and that also killed Curi Paucar, the required protect objective. The
    // garrison's soldiers hold the line with them; Curi stays at the camp.
    const units = [...g.units.values()].filter(
      (u: any) =>
        u.owner === 0 && (u.kind === 'inca_warrior' || u.kind === 'soldier') && u.tag !== 'curi_paucar' && !u.dead,
    ) as any[];
    const target = { x: 180, z: 97 };
    for (const unit of units) {
      g.executeCommand({ kind: 'order', unitIds: [unit.id], order: { kind: 'move', target }, clear: true }, false);
    }
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(150 / dt) && !g.mission.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      units: units.length,
      huayna: g.mission.getObjectiveState('a1_huayna') as string,
      curi: g.mission.getObjectiveState('a2_curi') as string,
      evacua: g.mission.getObjectiveState('a2_evacua') as string,
      huida: g.mission.getObjectiveState('a3_huida') as string,
      ended: g.mission.ended as boolean,
    };
  });

  expect(out.units).toBeGreaterThanOrEqual(5);
  expect(out.huayna, 'Huayna Pucará was not held after real move orders').toBe('completed');
  expect(out.curi, 'Curi Paucar survived the hold').not.toBe('failed');
  expect(out.evacua, 'the evacuation did not open after the fortress').toBe('activo');
  expect(out.huida, 'the escape opened before the evacuation').toBe('pendiente');
  expect(out.ended).toBe(false);
  expect(errors).toEqual([]);
});
