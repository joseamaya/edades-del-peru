import { expect, test, type Page } from '@playwright/test';

const MISSIONS = [
  { mission: 'm4_wari', player: 'wari', enemy: 'tiahuanaco' },
  { mission: 'm5_yahuar_pampa', player: 'inca', enemy: 'chanca' },
  { mission: 'm6_chimu_inca', player: 'inca', enemy: 'chimu' },
] as const;

async function boot(page: Page, mission: string): Promise<void> {
  await page.goto(`/?mission=${mission}&intro=0&fog=0&low=1&noloop=1`);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test.describe('Middle and Late Horizon rigged infantry', () => {
  for (const spec of MISSIONS) {
    test(`${spec.mission} uses the ${spec.player}/${spec.enemy} rigs`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await boot(page, spec.mission);

      const out = await page.evaluate(() => {
        const g = (window as unknown as { game: any }).game;
        g.loop.stop();
        const base = g.playerCenter(0);
        const c = g.findLandNear(base.x + 12, base.z + 12, 16);
        const worker = g.spawnScriptedUnit('worker', 0, c.x - 1.8, c.z + 0.4);
        const soldier = g.spawnScriptedUnit('soldier', 0, c.x, c.z - 0.7);
        const ranged = g.spawnScriptedUnit('musketeer', 0, c.x + 1.8, c.z + 0.5);
        const enemy = g.spawnScriptedUnit('soldier', 1, c.x - 1.8, c.z - 1.2);
        const visible = (unit: any, name: string): boolean => {
          const mesh = unit?.rig?.root.getObjectByName(name);
          return !!mesh && mesh.visible;
        };
        const describe = (unit: any) => ({
          variant: unit?.rig?.variantId ?? null,
          tool: visible(unit, 'attire_tool'),
          carry: visible(unit, 'attire_carry'),
          manta: visible(unit, 'attire_andean_manta'),
          helmet: visible(unit, 'attire_andean_helmet'),
          backflap: visible(unit, 'attire_andean_backflap'),
          ear: visible(unit, 'attire_andean_ear'),
          belt: visible(unit, 'attire_andean_belt'),
          shield: visible(unit, 'attire_andean_shield'),
          macana: visible(unit, 'attire_andean_macana'),
          sling: visible(unit, 'attire_andean_sling'),
          pectoral: visible(unit, 'attire_andean_pectoral'),
          facePaint: visible(unit, 'attire_andean_face_paint'),
          sash: visible(unit, 'attire_andean_sash'),
          hasAttack: unit?.rig?.hasState('attack') ?? false,
          attackClip: unit?.rig?.currentClipName ?? null,
        });
        soldier?.rig?.play('attack', 0);
        ranged?.rig?.play('attack', 0);
        enemy?.rig?.play('attack', 0);
        return {
          worker: describe(worker),
          soldier: describe(soldier),
          ranged: describe(ranged),
          enemy: describe(enemy),
          allRigged: [worker, soldier, ranged, enemy].every((u: any) => !!u?.rig),
        };
      });

      expect(out.allRigged).toBe(true);
      expect(out.worker.variant).toMatch(new RegExp(`^${spec.player}_worker_[fm]$`));
      expect(out.soldier.variant).toMatch(new RegExp(`^${spec.player}_soldier_[fm]$`));
      expect(out.ranged.variant).toMatch(new RegExp(`^${spec.player}_ranged_[fm]$`));
      expect(out.enemy.variant).toMatch(new RegExp(`^${spec.enemy}_soldier_[fm]$`));

      expect(out.worker.tool).toBe(true);
      expect(out.worker.carry).toBe(false);
      expect(out.soldier.shield).toBe(true);
      expect(out.soldier.macana).toBe(true);
      expect(out.soldier.backflap).toBe(false);
      expect(out.soldier.hasAttack).toBe(true);
      expect(out.ranged.sling).toBe(true);

      if (spec.enemy === 'tiahuanaco') {
        expect(out.soldier.pectoral).toBe(true);
        expect(out.soldier.helmet).toBe(false);
        expect(out.enemy.helmet).toBe(true);
        expect(out.enemy.pectoral).toBe(false);
      }
      if (spec.enemy === 'chanca') {
        expect(out.soldier.sash).toBe(true);
        expect(out.enemy.facePaint).toBe(true);
        expect(out.enemy.sash).toBe(false);
      }
      if (spec.enemy === 'chimu') {
        expect(out.soldier.sash).toBe(true);
        expect(out.enemy.ear).toBe(true);
        expect(out.enemy.sash).toBe(false);
        expect(out.enemy.facePaint).toBe(false);
      }
      expect(errors).toEqual([]);
    });
  }
});
