import { test, expect } from '@playwright/test';
import { startMission } from './mission-start';

/**
 * Tarapacá 1879: the first Chilean column must be answered with real orders. The old spec only moved
 * the squad to the village and parked Cáceres out of the fight, which hid the fact that the line
 * never returned fire.
 */
test('m_tarapaca answers the first column and holds the village with real orders', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?mission=m_tarapaca&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await startMission(page);
  // The opening camera flight holds the mission clock; let it finish so the fixed-step loop measures
  // mission time, not a partially skipped cinematic.
  await page.waitForFunction(
    () => !(window as unknown as { game: { isCinematicActive: () => boolean } }).game.isCinematicActive(),
    null,
    {
      timeout: 30_000,
    },
  );

  const exchange = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const hp = (owner: number): number =>
      ([...g.units.values()] as any[]).filter((u) => u.owner === owner && !u.dead).reduce((sum, u) => sum + u.hp, 0);
    const dt = 1 / 60;
    let t = 0;
    const run = (seconds: number): void => {
      const steps = Math.ceil(seconds / dt);
      for (let i = 0; i < steps && !g.mission.ended; i++) {
        g.update(dt, t);
        t += dt;
      }
    };

    // No orders: stand the line. The first column must trade fire instead of destroying it for free.
    run(25);
    const column = ([...g.units.values()] as any[]).filter((u) => u.owner === 1 && !u.dead).map((u) => u.id);
    const columnHp = column.reduce((sum, id) => sum + (g.units.get(id)?.hp ?? 0), 0);
    const playerHp = hp(0);
    run(45);
    const columnAfter = column.reduce((sum, id) => sum + (g.units.get(id)?.dead ? 0 : (g.units.get(id)?.hp ?? 0)), 0);

    return {
      ended: g.mission.ended as boolean,
      caceres: ([...g.units.values()] as any[]).some((u) => u.tag === 'caceres' && !u.dead),
      playerHp,
      playerAfter: hp(0),
      columnHp,
      columnAfter,
      units: ([...g.units.values()] as any[]).filter((u) => u.owner === 0 && !u.dead).length,
      workers: ([...g.units.values()] as any[]).filter((u) => u.owner === 0 && !u.dead && u.kind === 'worker').length,
      buildings: g.buildings.size,
    };
  });

  expect(exchange.ended, `the first column wiped the village before it could answer: ${JSON.stringify(exchange)}`).toBe(
    false,
  );
  expect(exchange.caceres, 'Cáceres must survive the opening exchange').toBe(true);
  expect(exchange.playerAfter, 'the defenders should take the first volley').toBeLessThan(exchange.playerHp);
  expect(exchange.columnAfter, `the defenders never returned fire: ${JSON.stringify(exchange)}`).toBeLessThan(
    exchange.columnHp,
  );
  expect(exchange.workers, 'Tarapacá is a battle, not a settlement').toBe(0);
  expect(exchange.buildings, 'neither side starts with a generic base').toBe(0);

  // Now hold the village with ordinary move orders (no commander parking, no objective cheats).
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const units = ([...g.units.values()] as any[]).filter((u) => u.owner === 0 && !u.dead);
    const target = { x: 96, z: 168 };
    for (const unit of units) {
      g.executeCommand({ kind: 'order', unitIds: [unit.id], order: { kind: 'move', target }, clear: true }, false);
    }
    const dt = 1 / 60;
    let t = 120;
    for (let i = 0; i < Math.ceil(120 / dt) && !g.mission.ended; i++) {
      g.update(dt, t);
      t += dt;
    }
    return {
      pueblo: g.mission.getObjectiveState('a1_pueblo') as string,
      alturas: g.mission.getObjectiveState('a2_alturas') as string,
      ended: g.mission.ended as boolean,
    };
  });

  expect(out.pueblo, 'the village was not held after real move orders').toBe('completed');
  expect(out.alturas, 'the heights open only after the hold').toBe('activo');
  expect(out.ended).toBe(false);
  expect(errors).toEqual([]);
});
