import { describe, it, expect } from 'vitest';
import { UnitKind, HistoricalPeriod } from '../src/core/types';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { UNIT_ARCHETYPES, unitMinPeriod, isConverter } from '../src/model/defs/units';
import { getPeriod } from '../src/model/defs/periods';

/** Every unit kind that a mission spawns (starting army + scripted waves/reinforcements). */
function missionUnits(mission: (typeof MISSIONS)[number]): UnitKind[] {
  const kinds: UnitKind[] = [];
  for (const u of mission.start.units ?? []) kinds.push(u.kind);
  for (const trigger of mission.triggers) {
    for (const fx of trigger.effects) {
      if (fx.type === 'wave' || fx.type === 'reinforce') {
        for (const u of fx.units) kinds.push(u.kind);
      }
    }
  }
  return kinds;
}

describe('historical chronology', () => {
  it('no campaign spawns a unit before its technology was introduced', () => {
    for (const mission of MISSIONS) {
      const period = getPeriod(mission.period);
      for (const kind of missionUnits(mission)) {
        const min = unitMinPeriod(kind);
        expect(
          min,
          `${mission.id} (${period.name}) spawns ${kind}, which needs ${HistoricalPeriod[min]} or later`,
        ).toBeLessThanOrEqual(mission.period);
      }
    }
  });

  it('the guard is meaningful: post-1532 units are actually constrained', () => {
    // firearms, horses, artillery and engines arrive with the Viceroyalty (1532+)
    for (const kind of ['sniper', 'hussar', 'cavalry', 'artillery', 'mortar'] as UnitKind[]) {
      expect(unitMinPeriod(kind)).toBe(HistoricalPeriod.VICEROYALTY);
    }
    // vehicles, aircraft and rockets are contemporary (20th century)
    for (const kind of ['tank', 'anti_air', 'mec', 'nuclear'] as UnitKind[]) {
      expect(unitMinPeriod(kind)).toBe(HistoricalPeriod.CONTEMPORARY);
    }
  });

  it('conversion units: the Misionero is gated from the Viceroyalty', () => {
    expect(unitMinPeriod(UnitKind.MISSIONARY)).toBe(HistoricalPeriod.VICEROYALTY);
    expect(isConverter(UnitKind.COMMISSAR)).toBe(true);
    expect(isConverter(UnitKind.MISSIONARY)).toBe(true);
    expect(isConverter(UnitKind.SOLDIER)).toBe(false);
  });

  it('every scripted unit kind exists in the archetypes', () => {
    for (const mission of MISSIONS) {
      for (const kind of missionUnits(mission)) {
        expect(UNIT_ARCHETYPES[kind], `${mission.id} uses unknown unit ${kind}`).toBeDefined();
      }
    }
  });
});
