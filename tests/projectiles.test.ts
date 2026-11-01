import { describe, expect, it } from 'vitest';
import { Era, HistoricalPeriod, UnitKind } from '../src/core/types';
import { UNIT_ARCHETYPES, getUnitStats, overrideUnit, projectileFor, unitMinPeriod } from '../src/model/defs/units';
import { PERIODS } from '../src/model/defs/periods';
import { validateMod } from '../src/game/mods/schema';

const FIREARMS = new Set(['bullet', 'rocket', 'tracer']);
const PRE_1532_ERAS = [Era.FORMATIVE, Era.REGIONAL_STATES, Era.TAHUANTINSUYO];

describe('period projectiles', () => {
  it('never uses firearms before 1532, for any unit in any pre-colonial period', () => {
    for (const kind of Object.values(UnitKind)) {
      if (unitMinPeriod(kind) >= HistoricalPeriod.VICEROYALTY) continue;
      for (const period of PERIODS) {
        if (period.id >= HistoricalPeriod.VICEROYALTY) continue;
        expect(FIREARMS.has(getUnitStats(kind, period.level).projectile), `${kind} @ ${period.name}`).toBe(false);
      }
      for (const era of PRE_1532_ERAS) {
        expect(FIREARMS.has(getUnitStats(kind, era).projectile), `${kind} @ era ${era}`).toBe(false);
      }
    }
  });

  it('matches the ranged weapon of each era', () => {
    expect(projectileFor(UnitKind.MUSKETEER, Era.TAHUANTINSUYO)).toBe('sling_stone');
    expect(projectileFor(UnitKind.MUSKETEER, Era.VICEROYALTY)).toBe('bullet');
    expect(projectileFor(UnitKind.RIFLEMAN, Era.TAHUANTINSUYO)).toBe('arrow');
    expect(projectileFor(UnitKind.RIFLEMAN, Era.VICEROYALTY)).toBe('bullet');
    expect(projectileFor(UnitKind.SOLDIER, Era.CONTEMPORARY)).toBe('none');
    expect(projectileFor(UnitKind.WORKER, Era.CONTEMPORARY)).toBe('none');
  });

  it('keeps the pre-colonial units free of unknown archetypes', () => {
    expect(UNIT_ARCHETYPES[UnitKind.RIFLEMAN].eraIdentity?.[Era.TAHUANTINSUYO]?.weapon).toBe('bow');
    expect(UNIT_ARCHETYPES[UnitKind.MUSKETEER].eraIdentity?.[Era.TAHUANTINSUYO]?.weapon).toBe('sling');
  });

  it('keeps an explicit mod projectile override', () => {
    overrideUnit(UnitKind.MUSKETEER, { stats: { projectile: 'arrow' } });
    expect(getUnitStats(UnitKind.MUSKETEER, Era.VICEROYALTY).projectile).toBe('arrow');
    overrideUnit(UnitKind.MUSKETEER, { stats: { projectile: 'bullet' } });
    expect(getUnitStats(UnitKind.MUSKETEER, Era.VICEROYALTY).projectile).toBe('bullet');
  });

  it('rejects the retired laser/rail projectiles in mods', () => {
    const base = { schemaVersion: 2, name: 'x' };
    for (const projectile of ['laser', 'rail']) {
      const result = validateMod({
        ...base,
        units: [{ id: 'soldier', stats: { hp: 10, projectile } }],
      });
      expect(result.ok, projectile).toBe(false);
    }
    expect(validateMod({ ...base, units: [{ id: 'soldier', stats: { hp: 10, projectile: 'arrow' } }] }).ok).toBe(true);
  });
});
