import { describe, it, expect } from 'vitest';
import { ARMOR_BONUS_CAP, armorForType, computeDamage } from '../src/game/combat';

const INFANTRY = { light: 0, heavy: 0 };
const HUSSAR = { light: 1, heavy: 0 };
const CAVALRY = { light: 2, heavy: 0 };
const TANK = { light: 3, heavy: 2 };
const BUILDING = { light: 3, heavy: 3, building: 3 };

describe('armorForType', () => {
  it('maps each attack type to the matching defense', () => {
    expect(armorForType('light', HUSSAR)).toBe(1);
    expect(armorForType('heavy', TANK)).toBe(2);
    expect(armorForType('fortified', BUILDING)).toBe(3);
  });

  it('falls back to heavy armor for fortified attacks against units', () => {
    expect(armorForType('fortified', TANK)).toBe(2);
    expect(armorForType('fortified', INFANTRY)).toBe(0);
  });
});

describe('computeDamage', () => {
  it('subtracts the armor selected by the attack type', () => {
    expect(computeDamage(10, 'light', CAVALRY)).toBe(8);
    expect(computeDamage(10, 'heavy', CAVALRY)).toBe(10);
  });

  it('makes light and heavy attackers hit an armored defender differently', () => {
    const lightHit = computeDamage(10, 'light', HUSSAR);
    const heavyHit = computeDamage(10, 'heavy', HUSSAR);
    expect(lightHit).toBeLessThan(heavyHit);
  });

  it('uses building armor for fortified attacks', () => {
    expect(computeDamage(30, 'fortified', BUILDING)).toBe(27);
  });

  it('never deals less than 1 damage', () => {
    expect(computeDamage(2, 'fortified', BUILDING)).toBe(1);
    expect(computeDamage(1, 'light', TANK)).toBe(1);
  });

  it('reduces damage by the civilization armor bonus (percentage)', () => {
    // +10% armor on a 0-armor target: 10 * (1 - 0.1) = 9
    expect(computeDamage(10, 'heavy', INFANTRY, 1.1)).toBeCloseTo(9, 5);
    // the bonus applies after the base armor is subtracted
    expect(computeDamage(10, 'light', CAVALRY, 1.1)).toBeCloseTo((10 - 2) * 0.9, 5);
  });

  it('clamps the armor bonus so damage cannot go to zero', () => {
    const capped = computeDamage(10, 'heavy', INFANTRY, 1 + ARMOR_BONUS_CAP + 5);
    expect(capped).toBeCloseTo(10 * (1 - ARMOR_BONUS_CAP), 5);
    expect(capped).toBeGreaterThan(0);
  });

  it('ignores a missing/neutral armor multiplier', () => {
    expect(computeDamage(10, 'heavy', INFANTRY)).toBe(10);
    expect(computeDamage(10, 'heavy', INFANTRY, 1)).toBe(10);
  });
});
