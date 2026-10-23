import { expect, test, type Page } from '@playwright/test';

const URL = '/?mission=m3_moche_recuay&intro=0&fog=0&low=1&noloop=1';

async function boot(page: Page): Promise<void> {
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the Moche campaign uses rigged infantry instead of primitives', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page);

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const units = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead);
    const pick = (kind: string) => units.find((u: any) => u.kind === kind);
    const visible = (unit: any, name: string): boolean => {
      const mesh = unit?.rig?.root.getObjectByName(name);
      return !!mesh && mesh.visible;
    };
    const describe = (unit: any) => ({
      variant: unit?.rig?.variantId ?? null,
      tool: visible(unit, 'attire_tool'),
      carry: visible(unit, 'attire_carry'),
      sash: visible(unit, 'attire_sash'),
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
    const soldier = pick('soldier');
    const ranged = pick('musketeer');
    const worker = pick('worker');
    const scout = pick('scout');
    const recuay = g.spawnScriptedUnit('soldier', 1, g.playerCenter(0).x + 12, g.playerCenter(0).z + 12);
    soldier?.rig?.play('attack', 0);
    ranged?.rig?.play('attack', 0);
    return {
      soldier: describe(soldier),
      ranged: describe(ranged),
      worker: describe(worker),
      scout: describe(scout),
      recuay: describe(recuay),
      soldierKind: soldier?.kind ?? null,
      rangedKind: ranged?.kind ?? null,
      workerKind: worker?.kind ?? null,
      scoutKind: scout?.kind ?? null,
      allRigged: units.every((u: any) => !!u.rig),
    };
  });

  expect(out.soldierKind).toBe('soldier');
  expect(out.rangedKind).toBe('musketeer');
  expect(out.workerKind).toBe('worker');
  expect(out.scoutKind).toBe('scout');
  expect(out.allRigged).toBe(true);

  expect(out.soldier.variant).toMatch(/^moche_soldier_[fm]$/);
  expect(out.soldier.helmet).toBe(true);
  expect(out.soldier.backflap).toBe(true);
  expect(out.soldier.ear).toBe(true);
  expect(out.soldier.belt).toBe(true);
  expect(out.soldier.shield).toBe(true);
  expect(out.soldier.macana).toBe(true);
  expect(out.soldier.tool).toBe(false);
  expect(out.soldier.carry).toBe(false);
  expect(out.soldier.sash).toBe(false);
  expect(out.soldier.hasAttack).toBe(true);
  expect(out.soldier.attackClip).toBe('TreeChopping_Loop');

  expect(out.ranged.variant).toMatch(/^moche_ranged_[fm]$/);
  expect(out.ranged.sling).toBe(true);
  expect(out.ranged.helmet).toBe(false);
  expect(out.ranged.tool).toBe(false);
  expect(out.ranged.hasAttack).toBe(true);
  expect(out.ranged.attackClip).toBe('Punch_Jab');

  expect(out.worker.variant).toMatch(/^moche_worker_[fm]$/);
  expect(out.worker.tool).toBe(true);
  expect(out.worker.carry).toBe(false);
  expect(out.worker.helmet).toBe(false);

  expect(out.scout.variant).toMatch(/^moche_scout_[fm]$/);
  expect(out.scout.tool).toBe(false);
  expect(out.scout.carry).toBe(false);

  expect(out.recuay.variant).toMatch(/^recuay_soldier_[fm]$/);
  expect(out.recuay.macana).toBe(true);
  expect(out.recuay.helmet).toBe(false);
  expect(out.recuay.backflap).toBe(false);
  expect(errors).toEqual([]);
});
