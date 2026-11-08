import { describe, expect, it } from 'vitest';
import { techTreeData } from '../src/ui/TechTree';
import { BUILDING_DEFS } from '../src/model/defs/buildings';
import { UNIT_ARCHETYPES } from '../src/model/defs/units';
import { TECHS } from '../src/model/defs/techs';
import { PERIODS } from '../src/model/defs/periods';
import { CivId, Era, HistoricalPeriod } from '../src/core/types';

describe('tech tree', () => {
  it('is generated from the defs without losing any unlock', () => {
    const tree = techTreeData();
    for (const def of Object.values(BUILDING_DEFS)) {
      expect(tree[def.minEra].buildings.some((node) => node.id === def.id)).toBe(true);
    }
    for (const def of Object.values(UNIT_ARCHETYPES)) {
      for (const era of Object.keys(def.eraModel).map(Number)) {
        expect(tree[era].units.some((node) => node.id === def.id)).toBe(true);
      }
    }
    for (const tech of TECHS) {
      const era = PERIODS.find((period) => period.id === tech.minPeriod)?.level ?? 0;
      expect(tree[era].techs.some((node) => node.id === tech.id)).toBe(true);
    }
  });

  it('honours a mission technology allowlist', () => {
    const tree = techTreeData({
      civ: CivId.CHAVIN,
      period: HistoricalPeriod.EARLY_HORIZON,
      era: Era.REGIONAL_STATES,
      canBuild: () => true,
      canTrain: () => true,
      canResearch: (id) => id === 'chavin_pilgrimage',
    });
    expect(tree[0]?.techs.map((node) => node.id)).toEqual(['chavin_pilgrimage']);
  });

  it('has one column per era and unique ids inside each column', () => {
    const tree = techTreeData();
    expect(tree).toHaveLength(6);
    for (const era of tree) {
      for (const nodes of [era.buildings, era.units, era.techs]) {
        expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
      }
    }
  });
});
