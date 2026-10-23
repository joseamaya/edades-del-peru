import { expect, test, type Page } from '@playwright/test';

const MISSIONS = [
  {
    mission: 'm4_wari',
    player: 'wari',
    enemy: 'tiahuanaco',
    scout: 'wari_scout',
    soldierSash: false,
    soldierEar: true,
    rangedPectoral: true,
    pectoralStrap: true,
    enemyGear: { helmet: false, ear: false, pectoral: false, facePaint: false, sash: false },
    enemyRangedEar: false,
    enemyRangedFacePaint: false,
  },
  {
    mission: 'm5_yahuar_pampa',
    player: 'inca',
    enemy: 'chanca',
    scout: 'inca_chasqui',
    soldierSash: true,
    soldierEar: false,
    rangedPectoral: false,
    pectoralStrap: false,
    enemyGear: { helmet: false, ear: false, pectoral: false, facePaint: true, sash: false },
    enemyRangedEar: false,
    enemyRangedFacePaint: true,
  },
  {
    mission: 'm6_chimu_inca',
    player: 'inca',
    enemy: 'chimu',
    scout: 'inca_chasqui',
    soldierSash: true,
    soldierEar: false,
    rangedPectoral: false,
    pectoralStrap: false,
    enemyGear: { helmet: false, ear: true, pectoral: false, facePaint: false, sash: false },
    enemyRangedEar: true,
    enemyRangedFacePaint: false,
  },
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
        const scout = g.spawnScriptedUnit('scout', 0, c.x + 3.2, c.z - 0.2);
        const enemy = g.spawnScriptedUnit('soldier', 1, c.x - 1.8, c.z - 1.2);
        const enemyRanged = g.spawnScriptedUnit('musketeer', 1, c.x - 3.0, c.z + 0.8);
        const enemyScout = g.spawnScriptedUnit('scout', 1, c.x - 3.2, c.z - 0.4);
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
          backplate: visible(unit, 'attire_andean_backplate'),
          strap: visible(unit, 'attire_andean_pectoral_strap'),
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
          scout: describe(scout),
          enemy: describe(enemy),
          enemyRanged: describe(enemyRanged),
          enemyScout: describe(enemyScout),
          allRigged: [worker, soldier, ranged, scout, enemy, enemyRanged, enemyScout].every((u: any) => !!u?.rig),
        };
      });

      expect(out.allRigged).toBe(true);
      expect(out.worker.variant).toMatch(new RegExp(`^${spec.player}_worker_[fm]$`));
      expect(out.soldier.variant).toMatch(new RegExp(`^${spec.player}_soldier_[fm]$`));
      expect(out.ranged.variant).toMatch(new RegExp(`^${spec.player}_ranged_[fm]$`));
      expect(out.scout.variant).toMatch(new RegExp(`^${spec.scout}_[fm]$`));
      expect(out.enemy.variant).toMatch(new RegExp(`^${spec.enemy}_soldier_[fm]$`));
      expect(out.enemyRanged.variant).toMatch(new RegExp(`^${spec.enemy}_ranged_[fm]$`));
      expect(out.enemyScout.variant).toMatch(new RegExp(`^${spec.enemy}_scout_[fm]$`));

      expect(out.worker.tool).toBe(true);
      expect(out.worker.carry).toBe(false);
      expect(out.soldier.shield).toBe(true);
      expect(out.soldier.macana).toBe(true);
      expect(out.soldier.backflap).toBe(false);
      expect(out.soldier.hasAttack).toBe(true);
      expect(out.ranged.sling).toBe(true);
      expect(out.ranged.pectoral).toBe(spec.rangedPectoral);
      expect(out.ranged.backplate).toBe(spec.rangedPectoral);
      expect(out.enemyRanged.sling).toBe(true);
      expect(out.enemyRanged.ear).toBe(spec.enemyRangedEar);
      expect(out.enemyRanged.facePaint).toBe(spec.enemyRangedFacePaint);
      expect(out.soldier).toMatchObject({
        pectoral: spec.rangedPectoral,
        backplate: spec.rangedPectoral,
        strap: spec.pectoralStrap,
        sash: spec.soldierSash,
        ear: spec.soldierEar,
      });
      expect(out.ranged.ear).toBe(spec.soldierEar);
      expect(out.ranged.strap).toBe(spec.pectoralStrap);
      expect(out.enemy).toMatchObject(spec.enemyGear);
      expect(errors).toEqual([]);
    });
  }
});
