import { describe, expect, it } from 'vitest';
import { defensiveShotCount, defensiveShotDamage } from '../src/model/defs/buildings';

describe('garrison defensive fire', () => {
  it('adds one projectile per garrisoned unit', () => {
    expect(defensiveShotCount(0)).toBe(1);
    expect(defensiveShotCount(3)).toBe(4);
    expect(defensiveShotCount(-2)).toBe(1);
  });

  it('keeps the base shot at full damage and each garrison shot at 35%', () => {
    expect(defensiveShotDamage(20, 0)).toBe(20);
    expect(defensiveShotDamage(20, 1)).toBeCloseTo(7, 6);
  });
});
