import { describe, it, expect } from 'vitest';
import { Era } from '../src/core/types';
import { ARMY_MIX, armyWeightsFor } from '../src/game/aiComposition';

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
