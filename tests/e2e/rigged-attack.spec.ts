import { expect, test, type Page } from '@playwright/test';

const URL = '/?play=1&civ=caral&period=0&map=altiplano&seed=777&fog=0&low=1&noloop=1';

async function boot(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  return errors;
}

test('rigged Caral workers and scouts play an attack clip instead of falling back to idle', async ({ page }) => {
  const errors = await boot(page);
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const base = g.playerCenter(0);
    const c = g.findLandNear(base.x + 14, base.z + 14, 12);
    const target = g.spawnScriptedBuilding('house', 1, c.x + 1.2, c.z);
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    const scout = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'scout');
    if (!worker || !scout) throw new Error('missing Caral worker/scout');

    const attack = (unit: any) => {
      unit.clearOrders();
      const x = c.x - 1.8;
      unit.pos.set(x, g.terrain.getHeight(x, c.z), c.z);
      unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
      g.executeCommand({
        kind: 'order',
        unitIds: [unit.id],
        order: { kind: 'attack', entityId: target.id },
        clear: true,
      });
      let time = 0;
      for (let i = 0; i < 150; i++) {
        time += 1 / 60;
        g.loop.onUpdate(1 / 60, time);
      }
      return {
        variant: unit.rig?.variantId ?? null,
        state: unit.rig?.currentState ?? null,
        clip: unit.rig?.currentClipName ?? null,
      };
    };

    return { worker: attack(worker), scout: attack(scout) };
  });

  expect(result.worker.variant).toMatch(/^caral_worker_[fm]$/);
  expect(result.worker.state).toBe('attack');
  expect(result.worker.clip).toBe('TreeChopping_Loop');
  expect(result.scout.variant).toMatch(/^caral_scout_[fm]$/);
  expect(result.scout.state).toBe('attack');
  expect(result.scout.clip).toBe('Punch_Jab');
  expect(errors).toEqual([]);
});
