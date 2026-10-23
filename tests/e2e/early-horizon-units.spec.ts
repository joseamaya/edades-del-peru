import { expect, test, type Page } from '@playwright/test';

const URL = '/?mission=m2_chavin&intro=0&fog=0&low=1&noloop=1';

async function boot(page: Page): Promise<void> {
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the Chavín campaign and its Paracas rival use rigged infantry', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page);

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const base = g.playerCenter(0);
    const units = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead);
    const pick = (kind: string) => units.find((u: any) => u.kind === kind);
    const soldier = g.spawnScriptedUnit('soldier', 0, base.x + 10, base.z + 4);
    const ranged = g.spawnScriptedUnit('musketeer', 0, base.x + 8, base.z + 8);
    const paracas = g.spawnScriptedUnit('soldier', 1, base.x + 14, base.z + 4);
    const visible = (unit: any, name: string): boolean => {
      const mesh = unit?.rig?.root.getObjectByName(name);
      return !!mesh && mesh.visible;
    };
    const describe = (unit: any) => ({
      variant: unit?.rig?.variantId ?? null,
      tool: visible(unit, 'attire_tool'),
      carry: visible(unit, 'attire_carry'),
      manta: visible(unit, 'attire_andean_manta'),
      mantaHeight:
        (unit?.rig?.root.getObjectByName('attire_andean_manta')?.geometry?.parameters?.height as number | undefined) ??
        null,
      helmet: visible(unit, 'attire_andean_helmet'),
      backflap: visible(unit, 'attire_andean_backflap'),
      ear: visible(unit, 'attire_andean_ear'),
      belt: visible(unit, 'attire_andean_belt'),
      shield: visible(unit, 'attire_andean_shield'),
      macana: visible(unit, 'attire_andean_macana'),
      sling: visible(unit, 'attire_andean_sling'),
      hasAttack: unit?.rig?.hasState('attack') ?? false,
      attackClip: unit?.rig?.currentClipName ?? null,
    });
    soldier?.rig?.play('attack', 0);
    ranged?.rig?.play('attack', 0);
    paracas?.rig?.play('attack', 0);
    return {
      soldier: describe(soldier),
      ranged: describe(ranged),
      paracas: describe(paracas),
      worker: describe(pick('worker')),
      scout: describe(pick('scout')),
      allRigged: [...units, soldier, ranged].every((u: any) => !!u.rig),
    };
  });

  expect(out.soldier.variant).toMatch(/^chavin_soldier_[fm]$/);
  expect(out.soldier.macana).toBe(true);
  expect(out.soldier.shield).toBe(false);
  expect(out.soldier.helmet).toBe(false);
  expect(out.soldier.backflap).toBe(false);
  expect(out.soldier.ear).toBe(false);
  expect(out.soldier.belt).toBe(false);
  expect(out.soldier.tool).toBe(false);
  expect(out.soldier.hasAttack).toBe(true);
  expect(out.soldier.attackClip).toBe('TreeChopping_Loop');

  expect(out.ranged.variant).toMatch(/^chavin_ranged_[fm]$/);
  expect(out.ranged.sling).toBe(true);
  expect(out.ranged.hasAttack).toBe(true);
  expect(out.ranged.attackClip).toBe('Punch_Jab');

  expect(out.paracas.variant).toMatch(/^paracas_soldier_[fm]$/);
  expect(out.paracas.macana).toBe(true);
  expect(out.paracas.shield).toBe(false);
  expect(out.paracas.helmet).toBe(false);
  expect(out.paracas.backflap).toBe(false);
  expect(out.paracas.manta).toBe(true);
  expect(out.paracas.mantaHeight).toBeGreaterThan(out.soldier.mantaHeight as number);

  expect(out.worker.variant).toMatch(/^chavin_worker_[fm]$/);
  expect(out.worker.tool).toBe(true);
  expect(out.worker.carry).toBe(false);
  expect(out.worker.manta).toBe(true);
  expect(out.worker.macana).toBe(false);

  expect(out.scout.variant).toMatch(/^chavin_scout_[fm]$/);
  expect(out.scout.tool).toBe(false);
  expect(out.scout.carry).toBe(false);
  expect(out.allRigged).toBe(true);
  expect(errors).toEqual([]);
});
