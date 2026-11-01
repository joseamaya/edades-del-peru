import { describe, expect, it } from 'vitest';
import { Era, HistoricalPeriod, UnitKind } from '../src/core/types';
import { UNIT_ARCHETYPES, getUnitStats, projectileFor, unitMinPeriod } from '../src/model/defs/units';
import { validateMod } from '../src/game/mods/schema';

const FIREARMS = new Set(['bullet', 'rocket', 'tracer']);
const PRE_1532_ERAS = [Era.FORMATIVE, Era.REGIONAL_STATES, Era.TAHUANTINSUYO];

describe('period projectiles', () => {
  it('never uses firearms before 1532, for any unit in any pre-colonial era', () => {
    for (const kind of Object.values(UnitKind)) {
      if (unitMinPeriod(kind) >= HistoricalPeriod.VICEROYALTY) continue;
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
    expect(projectileFor(UnitKind.SOLDIER, Era.CONTEMPORARY)).toBe('sling_stone');
    expect(projectileFor(UnitKind.WORKER, Era.CONTEMPORARY)).toBe('sling_stone');
  });

  it('keeps the pre-colonial units free of unknown archetypes', () => {
    expect(UNIT_ARCHETYPES[UnitKind.RIFLEMAN].eraIdentity?.[Era.TAHUANTINSUYO]?.weapon).toBe('bow');
    expect(UNIT_ARCHETYPES[UnitKind.MUSKETEER].eraIdentity?.[Era.TAHUANTINSUYO]?.weapon).toBe('sling');
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
