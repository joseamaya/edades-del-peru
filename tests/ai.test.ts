import { describe, it, expect } from 'vitest';
import { Era } from '../src/core/types';
import { ARMY_MIX, armyWeightsFor } from '../src/game/aiComposition';
import {
  AI_PROFILES,
  DIFFICULTIES,
  armyTarget,
  attackThreshold,
  profileFor,
  workerTarget,
} from '../src/game/aiProfiles';

const NO_ENEMY = { melee: 0, ranged: 0, cavalry: 0 };

describe('AI army composition', () => {
  it('counters a ranged-heavy enemy with more cavalry weight', () => {
    const base = armyWeightsFor(Era.VICEROYALTY, NO_ENEMY);
    const vsRanged = armyWeightsFor(Era.VICEROYALTY, { melee: 0, ranged: 10, cavalry: 0 });
    expect(vsRanged.cavalry).toBeGreaterThan(base.cavalry);
  });

  it('counters a melee-heavy enemy with more ranged weight', () => {
    const base = armyWeightsFor(Era.VICEROYALTY, NO_ENEMY);
    const vsMelee = armyWeightsFor(Era.VICEROYALTY, { melee: 10, ranged: 0, cavalry: 0 });
    expect(vsMelee.ranged).toBeGreaterThan(base.ranged);
  });

  it('adds melee weight against cavalry', () => {
    const base = armyWeightsFor(Era.VICEROYALTY, NO_ENEMY);
    const vsCavalry = armyWeightsFor(Era.VICEROYALTY, { melee: 0, ranged: 0, cavalry: 5 });
    expect(vsCavalry.melee).toBeGreaterThan(base.melee);
  });

  it('has a melee-heavy early mix and a balanced late mix', () => {
    expect(ARMY_MIX[Era.REGIONAL_STATES].melee).toBeGreaterThan(ARMY_MIX[Era.REGIONAL_STATES].ranged);
    expect(ARMY_MIX[Era.CONTEMPORARY].ranged).toBeGreaterThan(0);
    expect(ARMY_MIX[Era.CONTEMPORARY].siege).toBeGreaterThan(0);
  });
});

describe('AI difficulty profiles', () => {
  it('defines a profile for every difficulty and falls back to normal', () => {
    for (const d of DIFFICULTIES) expect(AI_PROFILES[d]).toBeDefined();
    expect(profileFor(undefined)).toBe(AI_PROFILES.normal);
  });

  it('grows the economy and army with difficulty', () => {
    const era = Era.REGIONAL_STATES;
    const workers = DIFFICULTIES.map((d) => workerTarget(AI_PROFILES[d], era));
    const army = DIFFICULTIES.map((d) => armyTarget(AI_PROFILES[d], era));
    for (let i = 1; i < DIFFICULTIES.length; i++) {
      expect(workers[i]).toBeGreaterThan(workers[i - 1]);
      expect(army[i]).toBeGreaterThan(army[i - 1]);
    }
  });

  it('attacks later, retreats earlier and builds fewer at once on easier difficulty', () => {
    const era = Era.REGIONAL_STATES;
    expect(attackThreshold(AI_PROFILES.easy, era)).toBeGreaterThan(attackThreshold(AI_PROFILES.normal, era));
    expect(AI_PROFILES.easy.retreatHp).toBeGreaterThan(AI_PROFILES.legendary.retreatHp);
    expect(AI_PROFILES.easy.maxConcurrentBuilds).toBeLessThan(AI_PROFILES.hard.maxConcurrentBuilds);
    expect(AI_PROFILES.easy.techReserve).toBeGreaterThan(AI_PROFILES.hard.techReserve);
  });

  it('only the easier profiles skip advanced military and raiding', () => {
    expect(AI_PROFILES.easy.advancedMilitary).toBe(false);
    expect(AI_PROFILES.easy.raidEconomy).toBe(false);
    expect(AI_PROFILES.legendary.advancedMilitary).toBe(true);
    expect(AI_PROFILES.legendary.raidEconomy).toBe(true);
  });
});
