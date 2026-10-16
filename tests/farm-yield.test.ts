import { describe, it, expect } from 'vitest';
import { farmYieldMultiplier } from '../src/model/defs/farmYield';

describe('farm yield from terrain', () => {
  it('is neutral on bare dry ground', () => {
    expect(farmYieldMultiplier({ terrace: 0, moisture: 0, canal: 0 })).toBe(1);
  });

  it('grows with terracing, moisture and irrigation', () => {
    const base = farmYieldMultiplier({ terrace: 0, moisture: 0, canal: 0 });
    expect(farmYieldMultiplier({ terrace: 0.5, moisture: 0, canal: 0 })).toBeGreaterThan(base);
    expect(farmYieldMultiplier({ terrace: 0, moisture: 0.5, canal: 0 })).toBeGreaterThan(base);
    expect(farmYieldMultiplier({ terrace: 0, moisture: 0, canal: 0.5 })).toBeGreaterThan(base);
  });

  it('clamps out-of-range inputs and never drops below 1', () => {
    expect(farmYieldMultiplier({ terrace: 5, moisture: 5, canal: 5 })).toBeCloseTo(1 + 0.8 + 0.4 + 0.6, 6);
    expect(farmYieldMultiplier({ terrace: -1, moisture: -1, canal: -1 })).toBe(1);
    expect(farmYieldMultiplier({ terrace: NaN, moisture: NaN, canal: NaN })).toBe(1);
  });
});
