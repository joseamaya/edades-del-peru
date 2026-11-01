import { describe, expect, it } from 'vitest';
import { HistoricalPeriod, UnitKind } from '../src/core/types';
import { PERIODS } from '../src/model/defs/periods';
import { UNIT_ARCHETYPES, UnitClass, unitClassFor, unitMinPeriod } from '../src/model/defs/units';

const MILITARY: UnitClass[] = ['infantry', 'ranged', 'cavalry', 'siege'];

describe('counter table', () => {
  it('gives every military class available in a period at least one counter', () => {
    for (const period of PERIODS) {
      const available = (Object.values(UnitKind) as UnitKind[]).filter((kind) => unitMinPeriod(kind) <= period.id);
      const classes = new Set(available.map(unitClassFor));
      for (const target of MILITARY) {
        if (!classes.has(target)) continue;
        const counter = available.some((kind) => (UNIT_ARCHETYPES[kind].bonusVs?.[target] ?? 0) > 0);
        expect(counter, `${period.name} has no counter for ${target}`).toBe(true);
      }
    }
  });

  it('lets siege answer buildings once siege exists', () => {
    for (const period of PERIODS) {
      if (period.id < HistoricalPeriod.VICEROYALTY) continue;
      const available = (Object.values(UnitKind) as UnitKind[]).filter((kind) => unitMinPeriod(kind) <= period.id);
      expect(
        available.some((kind) => (UNIT_ARCHETYPES[kind].bonusVs?.building ?? 0) > 0),
        `${period.name} cannot answer buildings`,
      ).toBe(true);
    }
  });
});
