import { describe, it, expect } from 'vitest';
import { Era, UnitKind } from '../src/core/types';
import { validateMod } from '../src/game/mods/schema';
import { applyMod } from '../src/game/Mods';
import { getUnitStats } from '../src/model/defs/units';
import { getTech } from '../src/model/defs/techs';

const validMod = {
  schemaVersion: 1,
  name: 'test mod',
  units: [{ id: 'soldier', stats: { hp: 55, attack: 6 } }],
  techs: [
    {
      id: 'test_drill',
      name: 'Prueba',
      description: 'Tech de prueba',
      cost: { food: 10 },
      time: 5,
      minPeriod: 0,
      building: 'barracks',
      effect: { attackMult: 0.1 },
    },
  ],
};

describe('mod schema', () => {
  it('accepts a valid mod', () => {
    expect(validateMod(validMod).ok).toBe(true);
  });

  it('rejects an unknown schema version', () => {
    const r = validateMod({ ...validMod, schemaVersion: 99 });
    expect(r.ok).toBe(false);
  });

  it('rejects an unknown unit id', () => {
    const r = validateMod({ ...validMod, units: [{ id: 'dragon', stats: { hp: 1 } }] });
    expect(r.ok).toBe(false);
  });

  it('rejects a negative stat', () => {
    const r = validateMod({ ...validMod, units: [{ id: 'soldier', stats: { hp: -5 } }] });
    expect(r.ok).toBe(false);
  });

  it('rejects an unknown damage type', () => {
    const r = validateMod({ ...validMod, units: [{ id: 'soldier', stats: { damageType: 'plasma' } }] });
    expect(r.ok).toBe(false);
  });

  it('rejects an incomplete new tech', () => {
    const r = validateMod({ ...validMod, techs: [{ id: 'brand_new', name: 'X' }] });
    expect(r.ok).toBe(false);
  });
});

describe('mod apply', () => {
  it('overrides a unit stat and adds a tech', () => {
    const result = validateMod(validMod);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    applyMod(result.mod);
    // soldier hp multiplier is 1 in the Formative era
    expect(getUnitStats(UnitKind.SOLDIER, Era.FORMATIVE).hp).toBe(55);
    expect(getUnitStats(UnitKind.SOLDIER, Era.FORMATIVE).attack).toBe(6);
    expect(getTech('test_drill')).toBeDefined();
  });
});
